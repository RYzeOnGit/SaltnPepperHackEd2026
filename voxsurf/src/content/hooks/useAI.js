import { useState, useCallback } from 'react';

export function useAI(settings) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);

  const callOpenAI = useCallback(async (messages, options = {}) => {
    if (!settings.openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    setIsProcessing(true);
    
    // Dispatch thinking status
    const event = new CustomEvent('voxsurf:ai-status', {
      detail: { status: 'thinking' },
      bubbles: true,
      composed: true,
    });
    document.dispatchEvent(event);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 500,
          stream: options.stream || false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API error');
      }

      // Handle streaming
      if (options.stream) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        const respondingEvent = new CustomEvent('voxsurf:ai-status', {
          detail: { status: 'responding' },
          bubbles: true,
          composed: true,
        });
        document.dispatchEvent(respondingEvent);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() && line.startsWith('data: '));

          for (const line of lines) {
            if (line === 'data: [DONE]') continue;
            
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices[0]?.delta?.content || '';
              if (content) {
                fullText += content;
                // Dispatch streaming chunk
                document.dispatchEvent(new CustomEvent('voxsurf:ai-streaming', {
                  detail: { text: fullText, chunk: content },
                }));
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }

        setLastResponse(fullText);
        setIsProcessing(false);
        
        const idleEvent = new CustomEvent('voxsurf:ai-status', {
          detail: { status: 'idle' },
          bubbles: true,
          composed: true,
        });
        document.dispatchEvent(idleEvent);

        return fullText;
      }

      // Non-streaming response
      const data = await response.json();
      const result = data.choices[0].message.content;
      setLastResponse(result);
      setIsProcessing(false);
      
      const idleEvent2 = new CustomEvent('voxsurf:ai-status', {
        detail: { status: 'idle' },
        bubbles: true,
        composed: true,
      });
      document.dispatchEvent(idleEvent2);

      return result;
    } catch (error) {
      console.error('OpenAI API error:', error);
      setIsProcessing(false);
      
      const errorIdleEvent = new CustomEvent('voxsurf:ai-status', {
        detail: { status: 'idle' },
        bubbles: true,
        composed: true,
      });
      document.dispatchEvent(errorIdleEvent);
      
      throw error;
    }
  }, [settings.openaiKey]);

  const understandCommand = useCallback(async (transcript, context) => {
    const systemPrompt = `You are VoxSurf, an AI assistant that controls a web browser hands-free.
You will receive:
- A voice transcript from the user
- The current page URL and title
- A list of labeled interactive elements on the page (number, type, text)
- The element the user is currently looking at (gaze target)
- Recent command history

Your job is to return a structured JSON action object that VoxSurf should execute.

Always return valid JSON only. No explanation. No markdown.

Action schema:
{
  "action": string,         // e.g. "click", "scroll", "type", "navigate", "read", "summarize"
  "target": number | null,  // element label number if applicable
  "value": string | null,   // text to type, URL to navigate, etc.
  "confidence": number,     // 0–1
  "spoken_confirmation": string  // what VoxSurf should say out loud before executing
}`;

    const userMessage = `Transcript: "${transcript}"
URL: ${context.url}
Title: ${context.title}
Gaze Target: ${context.gazeTarget ? `#${context.gazeTarget.index}: ${context.gazeTarget.text} (${context.gazeTarget.type})` : 'none'}
Elements: ${JSON.stringify(context.elements.slice(0, 20).map(e => ({
  index: e.index,
  type: e.type,
  text: e.text.substring(0, 30),
  ariaLabel: e.ariaLabel,
})))}
Recent Commands: ${context.recentCommands.join(', ')}

Return the action JSON:`;

    try {
      const response = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ], { temperature: 0.3, max_tokens: 200 });

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Invalid JSON response from AI');
    } catch (error) {
      console.error('Command understanding error:', error);
      return {
        action: 'unknown',
        target: null,
        value: null,
        confidence: 0,
        spoken_confirmation: 'I did not understand that command.',
      };
    }
  }, [callOpenAI]);

  const summarizePage = useCallback(async (pageText, stream = false) => {
    const prompt = `Summarize this web page in 2 sentences. List the 5 most important interactive actions the user can take. Return JSON:
{
  "summary": string,
  "actions": [string, string, string, string, string]
}`;

    try {
      const response = await callOpenAI([
        { role: 'system', content: 'You are a helpful assistant that summarizes web pages.' },
        { role: 'user', content: `Page content:\n\n${pageText.substring(0, 4000)}\n\n${prompt}` },
      ], { temperature: 0.5, max_tokens: 300, stream });

      if (stream) {
        // For streaming, return the full text and let caller parse
        return { summary: response, actions: [], streaming: true };
      }

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { summary: response, actions: [] };
    } catch (error) {
      console.error('Summarization error:', error);
      return { summary: 'Failed to summarize page', actions: [] };
    }
  }, [callOpenAI]);

  const analyzeForm = useCallback(async (formFields) => {
    const prompt = `This form has the following fields: ${JSON.stringify(formFields)}
What information is this form asking for? Generate a list of fields and ask the user to provide each one. Return JSON:
{
  "fields": [{"name": string, "type": string, "required": boolean, "question": string}]
}`;

    try {
      const response = await callOpenAI([
        { role: 'system', content: 'You are a helpful assistant that helps users fill out forms.' },
        { role: 'user', content: prompt },
      ], { temperature: 0.4, max_tokens: 400 });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { fields: [] };
    } catch (error) {
      console.error('Form analysis error:', error);
      return { fields: [] };
    }
  }, [callOpenAI]);

  const getContextualHelp = useCallback(async (url, title, elements) => {
    const prompt = `The user is on: ${title} (${url})
Available interactive elements: ${elements.slice(0, 15).map(e => `#${e.index}: ${e.text}`).join(', ')}

What are the top 5 most useful voice commands for this specific page? Return JSON:
{
  "commands": [string, string, string, string, string]
}`;

    try {
      const response = await callOpenAI([
        { role: 'system', content: 'You are a helpful assistant that suggests voice commands.' },
        { role: 'user', content: prompt },
      ], { temperature: 0.6, max_tokens: 200 });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { commands: [] };
    } catch (error) {
      console.error('Contextual help error:', error);
      return { commands: [] };
    }
  }, [callOpenAI]);

  return {
    isProcessing,
    lastResponse,
    callOpenAI,
    understandCommand,
    summarizePage,
    analyzeForm,
    getContextualHelp,
  };
}
