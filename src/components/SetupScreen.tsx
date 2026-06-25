import { useState } from 'react'
import { useSettingsStore } from '../store'

export function SetupScreen() {
  const { syncCode, setSyncCode } = useSettingsStore()
  const [input, setInput] = useState(syncCode)
  const [saved, setSaved] = useState(false)

  const save = () => {
    setSyncCode(input.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md shadow-xl">
        <div className="mb-8 text-center">
          <div className="text-4xl mb-3">🎬</div>
          <h1 className="text-2xl font-bold text-white">Cinema Till</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Enter the sync code from your scheduler to link this till.
          </p>
        </div>

        <label className="block text-sm font-medium text-gray-300 mb-2">
          Sync Code
        </label>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />

        <button
          onClick={save}
          disabled={!input.trim()}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {saved ? '✓ Saved' : 'Connect'}
        </button>

        {syncCode && (
          <p className="mt-4 text-center text-xs text-gray-500">
            Connected to: <span className="text-gray-400 font-mono">{syncCode}</span>
          </p>
        )}
      </div>
    </div>
  )
}
