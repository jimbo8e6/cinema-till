import { useState } from 'react'
import { useSchedule } from '../hooks/useSchedule'
import { useConcessions } from '../hooks/useConcessions'
import { useBasketStore, useSettingsStore } from '../store'
import { TicketsTab } from './TicketsTab'
import { ConcessionsTab } from './ConcessionsTab'
import { Basket } from './Basket'
import { formatPrice } from '../lib/utils'

type Tab = 'tickets' | 'concessions'

export function TillApp() {
  const [tab, setTab] = useState<Tab>('tickets')
  const [basketOpen, setBasketOpen] = useState(false)
  const syncCode = useSettingsStore((s) => s.syncCode)
  const setSyncCode = useSettingsStore((s) => s.setSyncCode)
  const { items, total } = useBasketStore()
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  useSchedule()
  useConcessions()

  return (
    <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-base">🎬 Till</span>
          <span className="text-gray-600 text-xs font-mono hidden sm:inline truncate max-w-[12rem]">
            {syncCode}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSyncCode('')}
            className="text-gray-500 hover:text-gray-300 text-xs hidden sm:block"
          >
            Settings
          </button>
          {/* Mobile basket toggle */}
          <button
            onClick={() => setBasketOpen(true)}
            className="sm:hidden relative bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg"
          >
            Basket
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="bg-gray-800 border-b border-gray-700 flex flex-shrink-0">
        {(['tickets', 'concessions'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${
              tab === t
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t === 'tickets' ? '🎟️ Tickets' : '🍿 Concessions'}
          </button>
        ))}
      </nav>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'tickets' ? <TicketsTab /> : <ConcessionsTab />}
        </div>

        {/* Basket (desktop sidebar + mobile panel) */}
        <Basket
          mobileOpen={basketOpen}
          onMobileClose={() => setBasketOpen(false)}
        />
      </div>

      {/* Mobile bottom bar showing total */}
      {itemCount > 0 && !basketOpen && (
        <div className="sm:hidden bg-gray-800 border-t border-gray-700 p-3 flex-shrink-0">
          <button
            onClick={() => setBasketOpen(true)}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-between px-4"
          >
            <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
            <span>{formatPrice(total())}</span>
          </button>
        </div>
      )}
    </div>
  )
}
