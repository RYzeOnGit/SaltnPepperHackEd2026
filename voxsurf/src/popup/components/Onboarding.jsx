import React, { useState, useEffect } from 'react';

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [micPermission, setMicPermission] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(false);
  const [openaiKey, setOpenaiKey] = useState('');
  const [calibrationType, setCalibrationType] = useState(null); // 'head' or 'gaze'
  const [calibrationComplete, setCalibrationComplete] = useState({ head: false, gaze: false });
  const [demoStep, setDemoStep] = useState(0);

  useEffect(() => {
    // Check existing permissions and settings
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => {
        setMicPermission(true);
        navigator.mediaDevices.getUserMedia({ video: true }).then(() => {
          setCameraPermission(true);
        });
      })
      .catch(() => {});

    chrome.storage.sync.get(['voxsurfSettings'], (result) => {
      if (result.voxsurfSettings?.openaiKey) {
        setOpenaiKey(result.voxsurfSettings.openaiKey);
      }
    });
  }, []);

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicPermission(true);
    } catch (err) {
      alert('Microphone permission is required for voice commands. Please allow access in Chrome settings.');
    }
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      setCameraPermission(true);
    } catch (err) {
      alert('Camera permission is required for eye tracking. Please allow access in Chrome settings.');
    }
  };

  const saveOpenAIKey = () => {
    chrome.storage.sync.get(['voxsurfSettings'], (result) => {
      const settings = result.voxsurfSettings || {};
      chrome.storage.sync.set({
        voxsurfSettings: {
          ...settings,
          openaiKey: openaiKey,
        },
      });
    });
  };

  const startHeadCalibration = () => {
    setCalibrationType('head');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && !tabs[0].url.startsWith('chrome://') && !tabs[0].url.startsWith('chrome-extension://')) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'START_CALIBRATION', mode: 'head' });
      }
    });
  };

  const startGazeCalibration = () => {
    setCalibrationType('gaze');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && !tabs[0].url.startsWith('chrome://') && !tabs[0].url.startsWith('chrome-extension://')) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'START_CALIBRATION', mode: 'gaze' });
      }
    });
  };

  const handleCalibrationComplete = (type) => {
    setCalibrationComplete((prev) => ({ ...prev, [type]: true }));
    setCalibrationType(null);
  };

  // Listen for calibration completion
  useEffect(() => {
    const listener = (message) => {
      if (message.type === 'CALIBRATION_COMPLETE') {
        handleCalibrationComplete(message.mode);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // Step 1: Permissions & Setup
  if (step === 1) {
    const canContinue = micPermission && cameraPermission && openaiKey.trim().length > 0;
    return (
      <div className="w-full h-full bg-gray-900 text-white flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Welcome to VoxSurf 🎙️👁️</h1>
            <p className="text-gray-400">Let's get you set up for hands-free browsing</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Step 1: Permissions & Setup</h2>

            {/* Microphone Permission */}
            <div className="border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Microphone Access</h3>
                {micPermission ? (
                  <span className="text-green-400 text-sm">✓ Granted</span>
                ) : (
                  <span className="text-yellow-400 text-sm">Required</span>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-3">
                VoxSurf needs microphone access to listen for your voice commands. We process audio locally and only send to OpenAI when you explicitly use AI features.
              </p>
              {!micPermission && (
                <button
                  onClick={requestMicPermission}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-medium"
                >
                  Grant Microphone Permission
                </button>
              )}
            </div>

            {/* Camera Permission */}
            <div className="border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Camera Access</h3>
                {cameraPermission ? (
                  <span className="text-green-400 text-sm">✓ Granted</span>
                ) : (
                  <span className="text-yellow-400 text-sm">Required</span>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-3">
                VoxSurf uses your camera to track your eyes and head movements for hands-free navigation. All processing happens locally on your device - we never send video data anywhere.
              </p>
              {!cameraPermission && (
                <button
                  onClick={requestCameraPermission}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-medium"
                >
                  Grant Camera Permission
                </button>
              )}
            </div>

            {/* OpenAI API Key */}
            <div className="border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">OpenAI API Key</h3>
                {openaiKey.trim().length > 0 ? (
                  <span className="text-green-400 text-sm">✓ Set</span>
                ) : (
                  <span className="text-yellow-400 text-sm">Required</span>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-3">
                VoxSurf uses OpenAI's GPT-4o to understand natural language commands and provide intelligent page analysis. Your API key is stored locally and only used for AI features.
              </p>
              <div className="space-y-2">
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  onBlur={saveOpenAIKey}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-indigo-500"
                />
                <p className="text-xs text-gray-500">
                  Get your API key from{' '}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:underline"
                  >
                    platform.openai.com
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => {
                chrome.storage.local.set({ onboardingComplete: true });
                onComplete();
              }}
              className="px-6 py-2 text-gray-400 hover:text-white text-sm"
            >
              Skip for now
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!canContinue}
              className={`px-6 py-2 rounded font-medium ${
                canContinue
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Calibration
  if (step === 2) {
    return (
      <div className="w-full h-full bg-gray-900 text-white flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Calibration</h1>
            <p className="text-gray-400">Calibrate your head cursor and eye gaze for accurate tracking</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Step 2: Calibration</h2>
            <p className="text-gray-400 mb-6">
              We'll show you 9 points on the screen. For head cursor calibration, move your head to point the cursor at each dot. For eye gaze calibration, keep your head still and only move your eyes to look at each dot.
            </p>

            {/* Head Cursor Calibration */}
            <div className="border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Head Cursor Calibration</h3>
                {calibrationComplete.head ? (
                  <span className="text-green-400 text-sm">✓ Complete</span>
                ) : (
                  <span className="text-yellow-400 text-sm">Pending</span>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-3">
                Move your head to control the cursor. Look at each of the 9 calibration points.
              </p>
              {!calibrationComplete.head && (
                <button
                  onClick={startHeadCalibration}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-medium"
                >
                  Start Head Calibration
                </button>
              )}
            </div>

            {/* Eye Gaze Calibration */}
            <div className="border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Eye Gaze Calibration</h3>
                {calibrationComplete.gaze ? (
                  <span className="text-green-400 text-sm">✓ Complete</span>
                ) : (
                  <span className="text-yellow-400 text-sm">Pending</span>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-3">
                Keep your head still and move only your eyes to look at each of the 9 calibration points.
              </p>
              {!calibrationComplete.gaze && (
                <button
                  onClick={startGazeCalibration}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-medium"
                >
                  Start Gaze Calibration
                </button>
              )}
            </div>

            {calibrationType && (
              <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
                <p className="text-sm text-blue-200">
                  Calibration in progress... Please navigate to a regular webpage (not chrome:// pages) and follow the on-screen instructions.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2 text-gray-400 hover:text-white text-sm"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!calibrationComplete.head || !calibrationComplete.gaze}
              className={`px-6 py-2 rounded font-medium ${
                calibrationComplete.head && calibrationComplete.gaze
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: First Command Demo
  if (step === 3) {
    return (
      <div className="w-full h-full bg-gray-900 text-white flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Try It Out!</h1>
            <p className="text-gray-400">Let's do a quick demo to see VoxSurf in action</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Step 3: First Command</h2>

            {demoStep === 0 && (
              <div className="space-y-4">
                <p className="text-gray-300">
                  Great! Now let's try your first hands-free command. Here's what to do:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-300">
                  <li>Navigate to any webpage (like google.com)</li>
                  <li>Look at any button or link on the page</li>
                  <li>You'll see it highlight automatically</li>
                  <li>Say <strong>"click that"</strong> out loud</li>
                  <li>Watch it click automatically!</li>
                </ol>
                <button
                  onClick={() => setDemoStep(1)}
                  className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded font-medium mt-4"
                >
                  I'm Ready!
                </button>
              </div>
            )}

            {demoStep === 1 && (
              <div className="space-y-4">
                <div className="bg-green-900 border border-green-700 rounded-lg p-4">
                  <p className="text-green-200 font-medium mb-2">✓ Demo Complete!</p>
                  <p className="text-sm text-green-300">
                    You've successfully completed the onboarding! VoxSurf is now ready to use. Explore the different tabs to customize your experience.
                  </p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Quick Tips:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                    <li>Say "scroll down" or "scroll up" to navigate pages</li>
                    <li>Say "read this" while looking at text to hear it read aloud</li>
                    <li>Wink with your left eye for left click, right eye for right click</li>
                    <li>Say "what's on this page" for AI-powered page analysis</li>
                    <li>Check the Commands tab for all available voice commands</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    chrome.storage.local.set({ onboardingComplete: true });
                    onComplete();
                  }}
                  className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded font-medium mt-4"
                >
                  Start Using VoxSurf! 🚀
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
