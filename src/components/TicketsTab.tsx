import { useRef, useState } from 'react'
import { useScheduleStore } from '../store'
import { minutesToTime, todayDateString } from '../lib/utils'
import { TicketSelector } from './TicketSelector'
import type { Show } from '../types'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function formatDateLabel(dateStr: string, today: string): string {
  if (dateStr === today) return 'Today'
  if (dateStr === addDays(today, 1)) return 'Tomorrow'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function TicketsTab() {
  const { films, shows, loading, error } = useScheduleStore()
  const [selected, setSelected] = useState<Show | null>(null)
  const today = todayDateString()
  const [activeDate, setActiveDate] = useState(today)
  const calendarRef = useRef<HTMLInputElement>(null)

  const dateShows = shows
    .filter((s) => s.date === activeDate && s.isOpen)
    .sort((a, b) => a.startMinute - b.startMinute)

  const getFilm = (filmId: string) => films.find((f) => f.id === filmId)

  // Find the range of dates that have any shows
  const showDates = Array.from(new Set(shows.map((s) => s.date))).sort()
  const minDate = showDates[0] ?? today
  const maxDate = showDates[showDates.length - 1] ?? addDays(today, 30)

  const canGoBack = activeDate > minDate
  const canGoForward = activeDate < maxDate

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
            max={maxDate}
            onChange={(e) => e.target.value && setActiveDate(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
            tabIndex={-1}
          />
        </button>

        <button
          onClick={() => setActiveDate((d) => addDays(d, 1))}
          disabled={!canGoForward}
          className="w-9 h-9 rounded-lg bg-gray-800 text-white flex items-center justify-center hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg"
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
            return (
              <button
                key={show.id}
                onClick={() => setSelected(show)}
                className="bg-gray-800 hover:bg-gray-750 active:bg-gray-700 border border-gray-700 hover:border-blue-500 rounded-xl p-4 text-left transition-all"
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
                      style={{
                        aspectRatio: '2/3',
                        backgroundColor: film.color || '#374151',
                      }}
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
            )
          })}
        </div>
      )}

      {selected && (
        <TicketSelector
          show={selected}
          film={getFilm(selected.filmId)!}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
