import { useState, useEffect } from 'react'
import { useSchedule } from '../hooks/useSchedule'
import { useConcessions } from '../hooks/useConcessions'
import { useBasketStore, useSettingsStore, useScheduleStore } from '../store'
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
  const loading = useScheduleStore((s) => s.loading)
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  const { reload: reloadSchedule } = useSchedule()
  const { reload: reloadConcessions } = useConcessions()

  const handleRefresh = () => {
    reloadSchedule()
    reloadConcessions()
  }

  useEffect(() => {
    const INTERVAL = 60_000
    const tick = () => { if (document.visibilityState === 'visible') handleRefresh() }
    const id = setInterval(tick, INTERVAL)
    return () => clearInterval(id)
  }, [reloadSchedule, reloadConcessions])

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
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh schedule"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            >
              <path
                fillRule="evenodd"
                d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.46-.326Zm.11-8.548a.75.75 0 0 0-.752.756v2.43l-.31-.31A7 7 0 0 0 3.648 8.44a.75.75 0 0 0 1.46.326 5.5 5.5 0 0 1 9.202-2.466l.311.31H12.19a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .75-.75V3.117a.75.75 0 0 0-.75-.75l-.02.009Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
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
