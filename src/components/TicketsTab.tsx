import { useRef, useState } from 'react'
import { useScheduleStore } from '../store'
import { minutesToTime, todayDateString } from '../lib/utils'
import { TicketSelector } from './TicketSelector'
import { useSalesStore } from '../hooks/useSales'
import { RefundModal } from './RefundModal'
import type { Show } from '../types'

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const result = new Date(Date.UTC(y, m - 1, d + days))
  return result.toISOString().split('T')[0]
}

function formatDateLabel(dateStr: string, today: string): string {
  if (dateStr === today) return 'Today'
  if (dateStr === addDays(today, 1)) return 'Tomorrow'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

interface SalesModalProps {
  show: Show
  filmTitle: string
  onClose: () => void
  sales: { total: number; byType: { label: string; quantity: number }[] } | undefined
}

function SalesModal({ show, filmTitle, onClose, sales }: SalesModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-5 border-b border-gray-700 flex items-start justify-between">
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">{filmTitle}</h2>
            <p className="text-gray-400 text-sm mt-0.5">
              Screen {show.screen} · {minutesToTime(show.startMinute)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-xl leading-none ml-4 mt-0.5"
          >
            ×
          </button>
        </div>

        <div className="p-5">
          {!sales || sales.total === 0 ? (
            <p className="text-gray-500 text-sm text-center py-2">No tickets sold yet</p>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {sales.byType.map((b) => (
                  <div key={b.label} className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">{b.label}</span>
                    <span className="text-white font-semibold">{b.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
                <span className="text-gray-400 text-sm font-medium">Total sold</span>
                <span className="text-white text-lg font-bold">{sales.total}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function TicketsTab() {
  const { films, shows, screenCapacities, loading, error } = useScheduleStore()
  const salesByShow = useSalesStore((s) => s.salesByShow)
  const [selected, setSelected] = useState<Show | null>(null)
  const [salesShow, setSalesShow] = useState<Show | null>(null)
  const [refundOpen, setRefundOpen] = useState(false)
  const today = todayDateString()
  const [activeDate, setActiveDate] = useState(today)
  const calendarRef = useRef<HTMLInputElement>(null)

  const dateShows = shows
    .filter((s) => s.date === activeDate && s.isOpen)
    .sort((a, b) => a.startMinute - b.startMinute)

  const getFilm = (filmId: string) => films.find((f) => f.id === filmId)

  const showDates = Array.from(new Set(shows.map((s) => s.date))).sort()
  const minDate = showDates[0] ?? today
  const canGoBack = activeDate > minDate

  return (
    <>
      {/* Date navigation bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700 bg-gray-900 sticky top-0 z-10">
        <button
          onClick={() => setActiveDate((d) => addDays(d, -1))}
          disabled={!canGoBack}
          className="w-9 h-9 rounded-lg bg-gray-800 text-white flex items-center justify-center hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg"
        >
          ‹
        </button>

        <button
          onClick={() => calendarRef.current?.showPicker?.()}
          className="flex-1 text-center py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors relative"
        >
          <span className="text-white font-semibold text-sm">
            {formatDateLabel(activeDate, today)}
          </span>
          {activeDate !== today && (
            <span className="text-gray-500 text-xs ml-2">{activeDate}</span>
          )}
          <input
            ref={calendarRef}
            type="date"
            value={activeDate}
            min={minDate}
            onChange={(e) => e.target.value && setActiveDate(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
            tabIndex={-1}
          />
        </button>

        <button
          onClick={() => setActiveDate((d) => addDays(d, 1))}
          disabled={false}
          className="w-9 h-9 rounded-lg bg-gray-800 text-white flex items-center justify-center hover:bg-gray-700 transition-colors text-lg"
        >
          ›
        </button>

        {activeDate !== today && (
          <button
            onClick={() => setActiveDate(today)}
            className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded"
          >
            Today
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64 text-gray-500">
          Loading schedule...
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-64 text-red-400 text-sm px-4 text-center">
          {error}
        </div>
      )}

      {!loading && !error && dateShows.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2">
          <span className="text-4xl">🎟️</span>
          <p>No open sessions on this day</p>
          <p className="text-xs text-gray-600">Sessions must be opened in the scheduler first</p>
        </div>
      )}

      {!loading && !error && dateShows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
          {dateShows.map((show) => {
            const film = getFilm(show.filmId)
            if (!film) return null
            const sales = salesByShow[show.id]
            const soldCount = sales?.total ?? 0
            const capacity = screenCapacities[String(show.screen)]
            const pct = capacity ? Math.min(100, (soldCount / capacity) * 100) : null
            const barColor = pct === null ? 'bg-blue-500'
              : pct >= 90 ? 'bg-red-500'
              : pct >= 70 ? 'bg-amber-500'
              : 'bg-green-500'
            return (
              <div key={show.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => setSelected(show)}
                  className="w-full p-4 text-left hover:bg-gray-750 active:bg-gray-700 transition-colors"
                >
                  <div className="flex gap-3 items-start">
                    {film.poster ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${film.poster}`}
                        alt={film.title}
                        className="w-10 rounded object-cover flex-shrink-0"
                        style={{ aspectRatio: '2/3' }}
                      />
                    ) : (
                      <div
                        className="w-10 rounded flex-shrink-0 flex items-center justify-center text-xs text-white/60"
                        style={{ aspectRatio: '2/3', backgroundColor: film.color || '#374151' }}
                      >
                        🎬
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm leading-tight line-clamp-2">
                        {film.title}
                      </p>
                      <p className="text-blue-400 font-mono text-sm mt-1">
                        {minutesToTime(show.startMinute)}
                      </p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-400">Screen {show.screen}</span>
                        {show.screeningType && (
                          <span className="text-xs text-gray-500">{show.screeningType}</span>
                        )}
                        {show.isSenior && (
                          <span className="text-xs bg-amber-900/50 text-amber-400 px-1.5 py-0.5 rounded">
                            Senior
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setSalesShow(show)}
                  className="w-full border-t border-gray-700 px-4 pt-2 pb-3 hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-gray-500 text-xs">Tickets sold</span>
                    <span className={`text-xs font-semibold ${soldCount > 0 ? 'text-white' : 'text-gray-600'}`}>
                      {capacity ? `${soldCount} / ${capacity}` : soldCount}
                    </span>
                  </div>
                  {capacity ? (
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  ) : (
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div className="h-1.5 w-0 rounded-full bg-blue-500" />
                    </div>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom action bar */}
      <div className="p-4 border-t border-gray-700 bg-gray-900">
        <div className="flex gap-3">
          <button
            onClick={() => setRefundOpen(true)}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white text-sm font-medium px-4 py-3 rounded-xl transition-colors"
          >
            <span>↩</span>
            Refund
          </button>
        </div>
      </div>

      {selected && (
        <TicketSelector
          show={selected}
          film={getFilm(selected.filmId)!}
          onClose={() => setSelected(null)}
        />
      )}

      {salesShow && (
        <SalesModal
          show={salesShow}
          filmTitle={getFilm(salesShow.filmId)?.title ?? ''}
          sales={salesByShow[salesShow.id]}
          onClose={() => setSalesShow(null)}
        />
      )}

      {refundOpen && <RefundModal onClose={() => setRefundOpen(false)} />}
    </>
  )
}
