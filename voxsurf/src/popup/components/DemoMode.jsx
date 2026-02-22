import React, { useState, useEffect } from 'react';

const DEMO_STEPS = [
  {
    id: 1,
    title: 'Welcome to VoxSurf Demo',
    description: 'This demo will walk you through the key features of hands-free browsing.',
    action: null,
  },
  {
    id: 2,
    title: 'Voice Commands',
    description: 'Try saying "scroll down" or "scroll up" to navigate the page.',
    action: 'scroll',
  },
  {
    id: 3,
    title: 'Eye Tracking',
    description: 'Look at any button or link. You\'ll see it highlight automatically.',
    action: 'gaze',
  },
  {
    id: 4,
    title: 'Voice Click',
    description: 'Look at an element and say "click that" to interact with it.',
    action: 'click',
  },
  {
    id: 5,
    title: 'Read Aloud',
    description: 'Say "read page" or "read this" to hear content read aloud.',
    action: 'read',
  },
  {
    id: 6,
    title: 'AI Summarization',
    description: 'Say "what\'s on this page" for an AI-powered summary.',
    action: 'summarize',
  },
  {
    id: 7,
    title: 'Wink to Click',
    description: 'Look at an element and wink with your left eye to click it.',
    action: 'wink',
  },
  {
    id: 8,
    title: 'Demo Complete!',
    description: 'You\'ve seen the main features. Explore the settings to customize your experience.',
    action: null,
  },
];

export default function DemoMode({ settings, updateSettings }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [demoProgress, setDemoProgress] = useState({});

  useEffect(() => {
    if (!isActive) return;

    // Listen for demo actions
    const listener = (e) => {
      if (e.detail && e.detail.action) {
        const step = DEMO_STEPS.find((s) => s.action === e.detail.action);
        if (step) {
          setDemoProgress((prev) => ({ ...prev, [step.id]: true }));
          // Auto-advance if this is the current step
          if (step.id === currentStep + 1) {
            setTimeout(() => {
              if (currentStep < DEMO_STEPS.length - 1) {
                setCurrentStep(currentStep + 1);
              }
            }, 2000);
          }
        }
      }
    };

    document.addEventListener('voxsurf:demo-action', listener);
    return () => document.removeEventListener('voxsurf:demo-action', listener);
  }, [isActive, currentStep]);

  const startDemo = () => {
    setIsActive(true);
    setCurrentStep(0);
    setDemoProgress({});

    // Enable voice and eye tracking if not already enabled
    if (!settings.voiceEnabled) {
      updateSettings({ voiceEnabled: true });
    }
    if (!settings.eyeEnabled) {
      updateSettings({ eyeEnabled: true });
    }

    // Notify content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'START_DEMO',
        });
      }
    });
  };

  const stopDemo = () => {
    setIsActive(false);
    setCurrentStep(0);
    setDemoProgress({});

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'STOP_DEMO',
        });
      }
    });
  };

  const nextStep = () => {
    if (currentStep < DEMO_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentDemoStep = DEMO_STEPS[currentStep];

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Demo Mode</h2>
            <p className="text-sm text-gray-400">
              Interactive walkthrough of VoxSurf features
            </p>
          </div>
          {!isActive ? (
            <button
              onClick={startDemo}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded font-medium"
            >
              Start Demo
            </button>
          ) : (
            <button
              onClick={stopDemo}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded font-medium"
            >
              Stop Demo
            </button>
          )}
        </div>

        {isActive && (
          <div className="bg-indigo-900 border border-indigo-700 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-indigo-200">
                Step {currentStep + 1} of {DEMO_STEPS.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="px-3 py-1 bg-indigo-700 hover:bg-indigo-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <button
                  onClick={nextStep}
                  disabled={currentStep === DEMO_STEPS.length - 1}
                  className="px-3 py-1 bg-indigo-700 hover:bg-indigo-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / DEMO_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {isActive && currentDemoStep && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-2">{currentDemoStep.title}</h3>
          <p className="text-gray-300 mb-4">{currentDemoStep.description}</p>

          {currentDemoStep.action && (
            <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
              <p className="text-sm text-blue-200">
                <strong>Try it:</strong> {getActionInstruction(currentDemoStep.action)}
              </p>
              {demoProgress[currentDemoStep.id] && (
                <div className="mt-2 text-green-400 text-sm">✓ Completed!</div>
              )}
            </div>
          )}

          <div className="mt-6 space-y-2">
            <h4 className="font-medium text-sm text-gray-400">Demo Steps:</h4>
            {DEMO_STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-2 p-2 rounded ${
                  index === currentStep
                    ? 'bg-indigo-900 border border-indigo-700'
                    : index < currentStep
                    ? 'bg-green-900 border border-green-700'
                    : 'bg-gray-700 border border-gray-600'
                }`}
              >
                {index < currentStep ? (
                  <span className="text-green-400">✓</span>
                ) : index === currentStep ? (
                  <span className="text-indigo-400">→</span>
                ) : (
                  <span className="text-gray-500">○</span>
                )}
                <span className="text-sm">{step.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isActive && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">What You'll Learn</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            {DEMO_STEPS.filter((s) => s.action).map((step) => (
              <li key={step.id} className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span>{step.title}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 p-4 bg-yellow-900 border border-yellow-700 rounded">
            <p className="text-sm text-yellow-200">
              <strong>Tip:</strong> Make sure you're on a regular webpage (not chrome:// pages) before starting the demo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function getActionInstruction(action) {
  const instructions = {
    scroll: 'Say "scroll down" or "scroll up"',
    gaze: 'Look at any interactive element on the page',
    click: 'Look at a button and say "click that"',
    read: 'Say "read page" or "read this"',
    summarize: 'Say "what\'s on this page" or "summarize this"',
    wink: 'Look at an element and wink with your left eye',
  };
  return instructions[action] || '';
}
