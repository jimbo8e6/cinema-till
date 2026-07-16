import { useState } from 'react'
import { useBasketStore, useScheduleStore } from '../store'
import { minutesToTime, formatPrice } from '../lib/utils'
import { SeatMapModal } from './SeatMapModal'
import type { Film, Show, SchedulerTicketType, BasketTicket } from '../types'

interface Props {
  show: Show
  film: Film
  onClose: () => void
}

export function TicketSelector({ show, film, onClose }: Props) {
  const { addTicket, items } = useBasketStore()
  const { ticketTypes, priceCards, seatPlans } = useScheduleStore()

  const priceCard = priceCards.find((pc) => pc.id === show.priceCard)
  const resolvedTypes = priceCard
    ? priceCard.ticketTypeIds
        .map((id) => ticketTypes.find((tt) => tt.id === id))
        .filter((tt): tt is NonNullable<typeof tt> => tt !== undefined)
    : ticketTypes

  const seatPlan = seatPlans[String(show.screen)]
  const hasSeatPlan = seatPlan && seatPlan.length > 0

  // Standard (no seat plan) state
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(resolvedTypes.map((tt) => [tt.id, 0]))
  )
  const PAGE_SIZE = 5
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(resolvedTypes.length / PAGE_SIZE)
  const pageTypes = resolvedTypes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Seat plan state
  const [selectedSeatsByType, setSelectedSeatsByType] = useState<Record<string, string[]>>(
    Object.fromEntries(resolvedTypes.map((tt) => [tt.id, []]))
  )
  const [seatMapType, setSeatMapType] = useState<SchedulerTicketType | null>(null)

  // Seats already committed to basket for this show (to mark as unavailable on the map)
  const basketSeatsForShow = items
    .filter((i): i is BasketTicket => i.kind === 'ticket' && i.showId === show.id && !!(i as BasketTicket).seatId)
    .map((i) => (i as BasketTicket).seatId!)

  const total = hasSeatPlan
    ? resolvedTypes.reduce((sum, tt) => sum + (selectedSeatsByType[tt.id]?.length ?? 0) * tt.price, 0)
    : resolvedTypes.reduce((sum, tt) => sum + (quantities[tt.id] ?? 0) * tt.price, 0)

  const hasItems = hasSeatPlan
    ? resolvedTypes.some((tt) => (selectedSeatsByType[tt.id]?.length ?? 0) > 0)
    : resolvedTypes.some((tt) => (quantities[tt.id] ?? 0) > 0)

  const adjust = (id: string, delta: number) =>
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }))

  const confirm = () => {
    if (hasSeatPlan) {
      resolvedTypes.forEach((tt) => {
        ;(selectedSeatsByType[tt.id] ?? []).forEach((seatId) =>
          addTicket(show, film, tt.id, tt.name, tt.price, 1, seatId)
        )
      })
    } else {
      resolvedTypes.forEach((tt) => {
        const qty = quantities[tt.id] ?? 0
        if (qty > 0) addTicket(show, film, tt.id, tt.name, tt.price, qty)
      })
    }
    onClose()
  }

  // All seats claimed in this selector session (across all ticket types)
  const allSessionSeats = Object.values(selectedSeatsByType).flat()

  return (
    <>
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
            ) : hasSeatPlan ? (
              // Seat-plan flow: one "Choose Seats" button per ticket type
              resolvedTypes.map((tt) => {
                const seats = selectedSeatsByType[tt.id] ?? []
                return (
                  <div key={tt.id}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-medium">{tt.name}</span>
                        <span className="text-gray-400 text-sm ml-2">{formatPrice(tt.price)}</span>
                      </div>
                      <button
                        onClick={() => setSeatMapType(tt)}
                        className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {seats.length > 0 ? `${seats.length} seat${seats.length !== 1 ? 's' : ''} ✏️` : 'Choose Seats'}
                      </button>
                    </div>
                    {seats.length > 0 && (
                      <p className="text-blue-400 text-xs mt-1 ml-0.5">{seats.sort().join(', ')}</p>
                    )}
                  </div>
                )
              })
            ) : (
              // Standard quantity flow
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

          {!hasSeatPlan && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 pb-3">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                className="text-sm px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ‹ Prev
              </button>
              <span className="text-gray-500 text-xs">Page {page + 1} of {totalPages}</span>
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

      {seatMapType && (
        <SeatMapModal
          showId={show.id}
          screenNumber={show.screen}
          seatPlan={seatPlan}
          ticketType={seatMapType}
          basketSeatsForShow={[...basketSeatsForShow, ...allSessionSeats.filter((s) => !( selectedSeatsByType[seatMapType.id] ?? []).includes(s))]}
          initialSelection={selectedSeatsByType[seatMapType.id] ?? []}
          onConfirm={(seats) => {
            setSelectedSeatsByType((prev) => ({ ...prev, [seatMapType.id]: seats }))
            setSeatMapType(null)
          }}
          onClose={() => setSeatMapType(null)}
        />
      )}
    </>
  )
}
