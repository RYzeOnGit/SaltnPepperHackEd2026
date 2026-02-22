import { useState, useRef, useCallback, useEffect } from 'react';
import { Readability } from '@mozilla/readability';

export function useReader(settings) {
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [currentSentence, setCurrentSentence] = useState('');
  const [highlightedElement, setHighlightedElement] = useState(null);
  const utteranceRef = useRef(null);
  const conversationContextRef = useRef([]);
  const sentenceIndexRef = useRef(0);

  // Readability is imported directly via npm, no need to load dynamically

  const extractPageText = useCallback(() => {
    try {
      const article = new Readability(document.cloneNode(true), {
        debug: false,
        maxElemsToDivideToAddMoreLineBreaks: 0,
      });
      const parsed = article.parse();
      return parsed.textContent || document.body.innerText || '';
    } catch (error) {
      console.error('Readability extraction error:', error);
      return document.body.innerText || '';
    }
  }, []);

  const splitIntoSentences = useCallback((text) => {
    return text.match(/[^.!?]+[.!?]+/g) || [text];
  }, []);

  const highlightSentenceInElement = useCallback((element, sentenceIndex, sentences) => {
    if (!element) return;

    // Remove previous highlights
    const previousHighlights = element.querySelectorAll('.voxsurf-sentence-highlight');
    previousHighlights.forEach((el) => {
      el.classList.remove('voxsurf-sentence-highlight');
      el.style.backgroundColor = '';
      el.style.transition = '';
    });

    // Use the sentences parameter (already calculated)
    
    if (sentenceIndex < sentences.length) {
      const targetSentence = sentences[sentenceIndex];
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent.includes(targetSentence)) {
          const range = document.createRange();
          const startIndex = node.textContent.indexOf(targetSentence);
          range.setStart(node, startIndex);
          range.setEnd(node, startIndex + targetSentence.length);

          const span = document.createElement('span');
          span.className = 'voxsurf-sentence-highlight';
          span.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
          span.style.transition = 'background-color 0.3s ease';
          span.style.borderRadius = '2px';
          span.style.padding = '2px 0';

          try {
            range.surroundContents(span);
          } catch (e) {
            // Fallback if surroundContents fails
            span.textContent = targetSentence;
            node.textContent = node.textContent.replace(targetSentence, '');
            node.parentNode.insertBefore(span, node);
          }
          break;
        }
      }
    }
  }, [splitIntoSentences]);

  const read = useCallback((text, options = {}) => {
    if (!text) return;

    if (utteranceRef.current) {
      speechSynthesis.cancel();
    }

    const sentences = splitIntoSentences(text);
    sentenceIndexRef.current = 0;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate || settings.readingSpeed || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;

    // Track sentence boundaries for highlighting
    let charIndex = 0;
    const updateHighlight = () => {
      if (sentenceIndexRef.current < sentences.length) {
        const sentence = sentences[sentenceIndexRef.current];
        setCurrentSentence(sentence);
        
        if (options.element) {
          highlightSentenceInElement(options.element, sentenceIndexRef.current, sentences);
        }

        // Dispatch event for HUD display
        document.dispatchEvent(new CustomEvent('voxsurf:reading', {
          detail: {
            sentence: sentence,
            index: sentenceIndexRef.current,
            total: sentences.length,
          },
        }));

        charIndex += sentence.length;
        sentenceIndexRef.current++;
      }
    };

    utterance.onstart = () => {
      setIsReading(true);
      setIsPaused(false);
      updateHighlight();
    };

    utterance.onboundary = (event) => {
      if (event.name === 'sentence') {
        updateHighlight();
      }
    };

    utterance.onend = () => {
      setIsReading(false);
      setIsPaused(false);
      utteranceRef.current = null;
      setCurrentSentence('');
      sentenceIndexRef.current = 0;
      
      // Remove highlights
      if (options.element) {
        const highlights = options.element.querySelectorAll('.voxsurf-sentence-highlight');
        highlights.forEach((el) => {
          el.classList.remove('voxsurf-sentence-highlight');
          el.style.backgroundColor = '';
        });
      }
    };

    utterance.onerror = (error) => {
      console.error('Speech synthesis error:', error);
      setIsReading(false);
      setIsPaused(false);
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
    setCurrentText(text);
  }, [settings.readingSpeed, splitIntoSentences, highlightSentenceInElement]);

  const readElement = useCallback((element) => {
    if (!element) return;

    const text = element.textContent?.trim() || 
                 element.getAttribute('aria-label') || 
                 element.getAttribute('placeholder') || 
                 element.getAttribute('title') || 
                 'No text content';

    read(text, { element });
    setHighlightedElement(element);
  }, [read]);

  const readPage = useCallback(() => {
    const text = extractPageText();
    read(text);
  }, [extractPageText, read]);

  const readStreaming = useCallback(async (streamGenerator, options = {}) => {
    // Read AI streaming response while it's being generated
    let fullText = '';
    let currentChunk = '';

    for await (const chunk of streamGenerator) {
      currentChunk += chunk;
      fullText += chunk;

      // Update HUD with streaming text
      document.dispatchEvent(new CustomEvent('voxsurf:ai-streaming', {
        detail: { text: fullText, chunk },
      }));

      // If we have a complete sentence, start reading it
      const sentences = splitIntoSentences(currentChunk);
      if (sentences.length > 1) {
        const sentenceToRead = sentences[0];
        if (!isReading && sentenceToRead.trim()) {
          read(sentenceToRead, options);
        }
        currentChunk = sentences.slice(1).join('');
      }
    }

    // Read remaining text
    if (currentChunk.trim() && !isReading) {
      read(currentChunk, options);
    }

    return fullText;
  }, [read, isReading, splitIntoSentences]);

  const askFollowUp = useCallback(async (question, aiHook) => {
    // Maintain conversation context for follow-up questions
    conversationContextRef.current.push({
      role: 'user',
      content: question,
    });

    try {
      const response = await aiHook.callOpenAI([
        { role: 'system', content: 'You are helping the user understand content they are reading. Provide concise, helpful answers.' },
        ...conversationContextRef.current.slice(-5), // Last 5 exchanges
      ], { temperature: 0.5, max_tokens: 200 });

      conversationContextRef.current.push({
        role: 'assistant',
        content: response,
      });

      read(response);
      return response;
    } catch (error) {
      console.error('Follow-up question error:', error);
      read('Sorry, I could not answer that question.');
      return null;
    }
  }, [read]);

  const pause = useCallback(() => {
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      setIsPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    if (speechSynthesis.paused) {
      speechSynthesis.resume();
      setIsPaused(false);
    }
  }, []);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsReading(false);
    setIsPaused(false);
    utteranceRef.current = null;
    setCurrentSentence('');
    sentenceIndexRef.current = 0;
    
    // Remove highlights
    if (highlightedElement) {
      const highlights = highlightedElement.querySelectorAll('.voxsurf-sentence-highlight');
      highlights.forEach((el) => {
        el.classList.remove('voxsurf-sentence-highlight');
        el.style.backgroundColor = '';
      });
    }
  }, [highlightedElement]);

  return {
    isReading,
    isPaused,
    currentText,
    currentSentence,
    read,
    readElement,
    readPage,
    readStreaming,
    askFollowUp,
    pause,
    resume,
    stop,
    extractPageText,
  };
}
