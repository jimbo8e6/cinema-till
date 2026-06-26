import { useState } from 'react'
import { useBasketStore, useScheduleStore } from '../store'
import { minutesToTime, formatPrice } from '../lib/utils'
import type { Film, Show } from '../types'

interface Props {
  show: Show
  film: Film
  onClose: () => void
}

export function TicketSelector({ show, film, onClose }: Props) {
  const addTicket = useBasketStore((s) => s.addTicket)
  const { ticketTypes, priceCards } = useScheduleStore()

  // Resolve which ticket types are available for this show
  const priceCard = priceCards.find((pc) => pc.id === show.priceCard)
  const resolvedTypes = priceCard
    ? priceCard.ticketTypeIds
        .map((id) => ticketTypes.find((tt) => tt.id === id))
        .filter((tt): tt is NonNullable<typeof tt> => tt !== undefined)
    : ticketTypes // fall back to all ticket types if no price card assigned

  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(resolvedTypes.map((tt) => [tt.id, 0]))
  )
  const PAGE_SIZE = 5
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(resolvedTypes.length / PAGE_SIZE)
  const pageTypes = resolvedTypes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const total = resolvedTypes.reduce((sum, tt) => sum + (quantities[tt.id] ?? 0) * tt.price, 0)
  const hasItems = resolvedTypes.some((tt) => (quantities[tt.id] ?? 0) > 0)

  const adjust = (id: string, delta: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }))
  }

  const confirm = () => {
    resolvedTypes.forEach((tt) => {
      const qty = quantities[tt.id] ?? 0
      if (qty > 0) addTicket(show, film, tt.id, tt.name, tt.price, qty)
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-5 border-b border-gray-700">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">{film.title}</h2>
              <p className="text-gray-400 text-sm mt-0.5">
                Screen {show.screen} · {minutesToTime(show.startMinute)}
                {show.screeningType ? ` · ${show.screeningType}` : ''}
              </p>
              {priceCard && (
                <p className="text-gray-500 text-xs mt-0.5">{priceCard.name} pricing</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 text-xl leading-none ml-4 mt-0.5"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {resolvedTypes.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No ticket types configured — add them in the scheduler.
            </p>
          ) : (
            pageTypes.map((tt) => (
              <div key={tt.id} className="flex items-center justify-between">
                <div>
                  <span className="text-white font-medium">{tt.name}</span>
                  <span className="text-gray-400 text-sm ml-2">{formatPrice(tt.price)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => adjust(tt.id, -1)}
                    className="w-9 h-9 rounded-full bg-gray-700 text-white text-xl flex items-center justify-center hover:bg-gray-600 active:bg-gray-500"
                  >
                    −
                  </button>
                  <span className="text-white w-5 text-center font-semibold">
                    {quantities[tt.id] ?? 0}
                  </span>
                  <button
                    onClick={() => adjust(tt.id, 1)}
                    className="w-9 h-9 rounded-full bg-blue-600 text-white text-xl flex items-center justify-center hover:bg-blue-500 active:bg-blue-400"
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 pb-3">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
              className="text-sm px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ‹ Prev
            </button>
            <span className="text-gray-500 text-xs">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages - 1}
              className="text-sm px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next ›
            </button>
          </div>
        )}

        <div className="p-4 border-t border-gray-700 flex items-center gap-3">
          <span className="text-gray-400 text-sm flex-1">
            {hasItems ? `Total: ${formatPrice(total)}` : 'Select tickets'}
          </span>
          <button
            onClick={confirm}
            disabled={!hasItems}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            Add to Basket
          </button>
        </div>
      </div>
    </div>
  )
}
