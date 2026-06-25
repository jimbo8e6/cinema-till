import { useState } from 'react'
import { useScheduleStore } from '../store'
import { minutesToTime, todayDateString } from '../lib/utils'
import { TicketSelector } from './TicketSelector'
import type { Show } from '../types'

export function TicketsTab() {
  const { films, shows, loading, error } = useScheduleStore()
  const [selected, setSelected] = useState<Show | null>(null)
  const today = todayDateString()

  const todaysShows = shows
    .filter((s) => s.date === today && s.isOpen)
    .sort((a, b) => a.startMinute - b.startMinute)

  const getFilm = (filmId: string) => films.find((f) => f.id === filmId)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading schedule...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400 text-sm px-4 text-center">
        {error}
      </div>
    )
  }

  if (todaysShows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2">
        <span className="text-4xl">🎟️</span>
        <p>No open sessions today</p>
        <p className="text-xs text-gray-600">Sessions must be opened in the scheduler first</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
        {todaysShows.map((show) => {
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
