import React, { useState, useEffect } from 'react';

const CHALLENGES = [
  {
    id: 1,
    name: 'First Voice Command',
    description: 'Say any voice command like "scroll down" or "go back"',
    category: 'voice',
    points: 10,
    hint: 'Try saying "scroll down" to navigate the page',
  },
  {
    id: 2,
    name: 'Navigate to Website',
    description: 'Use voice to open a new website (e.g., "open google.com")',
    category: 'voice',
    points: 15,
    hint: 'Say "open" followed by a website URL',
  },
  {
    id: 3,
    name: 'Gaze Highlight',
    description: 'Look at an interactive element and see it highlight',
    category: 'gaze',
    points: 10,
    hint: 'Simply look at any button, link, or form field',
  },
  {
    id: 4,
    name: 'Wink Click',
    description: 'Look at an element and wink with your left or right eye to click it',
    category: 'gaze',
    points: 20,
    hint: 'Look at a button, then wink with your left eye for left click',
  },
  {
    id: 5,
    name: 'Voice Click',
    description: 'Look at an element and say "click that"',
    category: 'voice',
    points: 15,
    hint: 'Look at any clickable element, then say "click that"',
  },
  {
    id: 6,
    name: 'Read Page',
    description: 'Use "read page" or "read this" command to hear content',
    category: 'voice',
    points: 15,
    hint: 'Say "read page" or "read this" while looking at text',
  },
  {
    id: 7,
    name: 'Page Summary',
    description: 'Use "what\'s on this page" or "summarize this" for AI analysis',
    category: 'ai',
    points: 25,
    hint: 'Say "what\'s on this page" to get an AI-powered summary',
  },
  {
    id: 8,
    name: 'Fill Form Field',
    description: 'Use voice to fill out a form field (e.g., "fill name with John")',
    category: 'voice',
    points: 20,
    hint: 'Look at a form field and say "fill [field] with [value]"',
  },
  {
    id: 9,
    name: 'Head Cursor Control',
    description: 'Move your head to control the cursor and navigate',
    category: 'gesture',
    points: 15,
    hint: 'Move your head left, right, up, or down to move the cursor',
  },
  {
    id: 10,
    name: 'Complete Workflow',
    description: 'Navigate to a page, read content, and interact with elements using only voice and gaze',
    category: 'advanced',
    points: 50,
    hint: 'Combine multiple commands: navigate, read, and interact hands-free',
  },
];

export default function ChallengeMode({ settings }) {
  const [challenges, setChallenges] = useState(CHALLENGES);
  const [completed, setCompleted] = useState([]);
  const [scores, setScores] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [aiGuidance, setAiGuidance] = useState('');
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    // Load completed challenges and scores
    chrome.storage.local.get(['completedChallenges', 'challengeScores', 'challengeLeaderboard'], (result) => {
      if (result.completedChallenges) {
        setCompleted(result.completedChallenges);
      }
      if (result.challengeScores) {
        setScores(result.challengeScores);
        const total = Object.values(result.challengeScores).reduce((sum, score) => sum + score, 0);
        setTotalPoints(total);
      }
      if (result.challengeLeaderboard) {
        setLeaderboard(result.challengeLeaderboard);
      }
    });

    // Listen for challenge completion events
    const listener = (e) => {
      if (e.detail && e.detail.challengeId) {
        completeChallenge(e.detail.challengeId);
      }
    };
    document.addEventListener('voxsurf:challenge-complete', listener);
    return () => document.removeEventListener('voxsurf:challenge-complete', listener);
  }, []);

  const completeChallenge = (challengeId) => {
    if (completed.includes(challengeId)) return;

    const challenge = challenges.find((c) => c.id === challengeId);
    if (!challenge) return;

    const newCompleted = [...completed, challengeId];
    const newScores = { ...scores, [challengeId]: challenge.points };
    const newTotal = totalPoints + challenge.points;

    setCompleted(newCompleted);
    setScores(newScores);
    setTotalPoints(newTotal);

    // Save to storage
    chrome.storage.local.set({
      completedChallenges: newCompleted,
      challengeScores: newScores,
    });

    // Update leaderboard
    updateLeaderboard(newTotal);
  };

  const updateLeaderboard = (points) => {
    chrome.storage.local.get(['challengeLeaderboard'], (result) => {
      const leaderboard = result.challengeLeaderboard || [];
      const entry = {
        date: new Date().toISOString(),
        points: points,
        challengesCompleted: completed.length + 1,
      };
      leaderboard.push(entry);
      leaderboard.sort((a, b) => b.points - a.points);
      const top10 = leaderboard.slice(0, 10);
      setLeaderboard(top10);
      chrome.storage.local.set({ challengeLeaderboard: top10 });
    });
  };

  const getAiGuidance = async (challengeId) => {
    const challenge = challenges.find((c) => c.id === challengeId);
    if (!challenge || !settings.openaiKey) return;

    setAiGuidance('Loading guidance...');
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant guiding users through VoxSurf challenges. Provide clear, concise instructions.',
            },
            {
              role: 'user',
              content: `I'm trying to complete this VoxSurf challenge: "${challenge.name}" - ${challenge.description}. ${challenge.hint ? `Hint: ${challenge.hint}` : ''} Give me step-by-step guidance on how to complete it.`,
            },
          ],
          max_tokens: 200,
        }),
      });

      const data = await response.json();
      if (data.choices && data.choices[0]) {
        setAiGuidance(data.choices[0].message.content);
      }
    } catch (error) {
      setAiGuidance('Unable to load AI guidance. Make sure your OpenAI API key is set in the AI tab.');
    }
  };

  const resetProgress = () => {
    if (confirm('Are you sure you want to reset all challenge progress?')) {
      setCompleted([]);
      setScores({});
      setTotalPoints(0);
      chrome.storage.local.set({
        completedChallenges: [],
        challengeScores: {},
      });
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      voice: 'bg-blue-600',
      gaze: 'bg-purple-600',
      ai: 'bg-yellow-600',
      gesture: 'bg-green-600',
      advanced: 'bg-red-600',
    };
    return colors[category] || 'bg-gray-600';
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Challenge Mode</h2>
            <p className="text-sm text-gray-400">
              Complete challenges to master hands-free browsing. Total Points: <span className="text-indigo-400 font-bold">{totalPoints}</span>
            </p>
          </div>
          <button
            onClick={resetProgress}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
          >
            Reset Progress
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-700 rounded p-4">
            <div className="text-3xl font-bold text-indigo-400">{completed.length}</div>
            <div className="text-sm text-gray-400">Challenges Completed</div>
          </div>
          <div className="bg-gray-700 rounded p-4">
            <div className="text-3xl font-bold text-green-400">{Math.round((completed.length / challenges.length) * 100)}%</div>
            <div className="text-sm text-gray-400">Completion Rate</div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Challenges</h3>
        <div className="space-y-3">
          {challenges.map((challenge) => (
            <div
              key={challenge.id}
              className={`p-4 rounded border ${
                completed.includes(challenge.id)
                  ? 'bg-green-900 border-green-600'
                  : 'bg-gray-700 border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(challenge.category)}`}>
                      {challenge.category}
                    </span>
                    <span className="text-sm text-gray-400">{challenge.points} pts</span>
                    {completed.includes(challenge.id) && (
                      <span className="text-green-400 text-xl">✓</span>
                    )}
                  </div>
                  <h4 className="font-medium text-lg mb-1">{challenge.name}</h4>
                  <p className="text-sm text-gray-400 mb-2">{challenge.description}</p>
                  {selectedChallenge === challenge.id && aiGuidance && (
                    <div className="bg-blue-900 border border-blue-700 rounded p-3 mt-2">
                      <p className="text-sm text-blue-200">{aiGuidance}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {!completed.includes(challenge.id) && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedChallenge(challenge.id);
                        getAiGuidance(challenge.id);
                      }}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-xs"
                    >
                      Get AI Guidance
                    </button>
                    <button
                      onClick={() => {
                        // Trigger challenge tracking in content script
                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                          if (tabs[0]) {
                            chrome.tabs.sendMessage(tabs[0].id, {
                              type: 'START_CHALLENGE',
                              challengeId: challenge.id,
                            });
                          }
                        });
                      }}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                    >
                      Start Challenge
                    </button>
                  </>
                )}
                {completed.includes(challenge.id) && (
                  <span className="text-sm text-green-400">Completed! +{challenge.points} points</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {leaderboard.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Leaderboard</h3>
          <div className="space-y-2">
            {leaderboard.slice(0, 10).map((entry, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-700 rounded"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-indigo-400">#{index + 1}</span>
                  <div>
                    <div className="font-medium">{entry.points} points</div>
                    <div className="text-xs text-gray-400">
                      {entry.challengesCompleted} challenges • {new Date(entry.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
