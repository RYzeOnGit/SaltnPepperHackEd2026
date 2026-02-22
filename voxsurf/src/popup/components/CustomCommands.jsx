import React, { useState, useEffect } from 'react';

export default function CustomCommands({ settings, updateSettings }) {
  const [commands, setCommands] = useState([]);
  const [newCommand, setNewCommand] = useState({ phrase: '', action: '' });

  useEffect(() => {
    chrome.storage.local.get(['customCommands'], (result) => {
      if (result.customCommands) {
        setCommands(result.customCommands);
      }
    });
  }, []);

  const saveCommands = (updatedCommands) => {
    setCommands(updatedCommands);
    chrome.storage.local.set({ customCommands: updatedCommands });
  };

  const addCommand = () => {
    if (newCommand.phrase && newCommand.action) {
      const updated = [...commands, { ...newCommand, id: Date.now() }];
      saveCommands(updated);
      setNewCommand({ phrase: '', action: '' });
    }
  };

  const removeCommand = (id) => {
    const updated = commands.filter((cmd) => cmd.id !== id);
    saveCommands(updated);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Custom Commands</h2>
        <div className="space-y-4">
          <div>
            <input
              type="text"
              value={newCommand.phrase}
              onChange={(e) => setNewCommand({ ...newCommand, phrase: e.target.value })}
              placeholder="Voice phrase (e.g., 'open email')"
              className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-indigo-500 focus:outline-none mb-2"
            />
            <input
              type="text"
              value={newCommand.action}
              onChange={(e) => setNewCommand({ ...newCommand, action: e.target.value })}
              placeholder="Action (e.g., 'navigate to gmail.com')"
              className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-indigo-500 focus:outline-none mb-2"
            />
            <button
              onClick={addCommand}
              className="w-full bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded font-medium"
            >
              Add Command
            </button>
          </div>

          <div className="space-y-2">
            {commands.map((cmd) => (
              <div
                key={cmd.id}
                className="flex items-center justify-between bg-gray-700 p-3 rounded"
              >
                <div>
                  <div className="font-medium">"{cmd.phrase}"</div>
                  <div className="text-sm text-gray-400">{cmd.action}</div>
                </div>
                <button
                  onClick={() => removeCommand(cmd.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            ))}
            {commands.length === 0 && (
              <p className="text-gray-400 text-center py-4">No custom commands yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
