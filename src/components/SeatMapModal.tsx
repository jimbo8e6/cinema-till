import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSettingsStore } from '../store'
import { formatPrice, getSeatIdsByType } from '../lib/utils'
import type { SeatPlan, BasketTicket } from '../types'

interface Props {
  showId: string
  screenNumber: number
  seatPlan: SeatPlan
  ticketType: { id: string; name: string; price: number }
  basketSeatsForShow: string[]  // seats in basket + other session types for this show
  initialSelection: string[]    // seats already chosen for this ticket type in the current session
  onConfirm: (seats: string[]) => void
  onClose: () => void
}

export function SeatMapModal({
  showId,
  screenNumber,
  seatPlan,
  ticketType,
  basketSeatsForShow,
  initialSelection,
  onConfirm,
  onClose,
}: Props) {
  const syncCode = useSettingsStore((s) => s.syncCode)
  const [takenSeats, setTakenSeats] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelection))
  const [loading, setLoading] = useState(true)
  const [companionWarning, setCompanionWarning] = useState(false)

  const ddaSeatIds = getSeatIdsByType(seatPlan, ['dda'])
  const companionSeatIds = getSeatIdsByType(seatPlan, ['companion'])

  useEffect(() => {
    supabase
      .from('transactions')
      .select('items')
      .eq('cinema_id', syncCode)
      .then(({ data }) => {
        const netQty = new Map<string, number>()
        for (const tx of data ?? []) {
          for (const item of (tx.items as BasketTicket[])) {
            if (item.kind !== 'ticket' || item.showId !== showId || !item.seatId) continue
            netQty.set(item.seatId, (netQty.get(item.seatId) ?? 0) + item.quantity)
          }
        }
        const taken = new Set<string>()
        for (const [seatId, net] of netQty) {
          if (net > 0) taken.add(seatId)
        }
        setTakenSeats(taken)
        setLoading(false)
      })
  }, [showId, syncCode])

  const toggle = (id: string) => {
    if (companionSeatIds.has(id)) {
      // Companion seats require a DDA seat to be claimed in the basket or current selection
      const hasDDA =
        basketSeatsForShow.some((s) => ddaSeatIds.has(s)) ||
        Array.from(selected).some((s) => ddaSeatIds.has(s))
      if (!hasDDA) {
        setCompanionWarning(true)
        return
      }
    }
    setCompanionWarning(false)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const basketSet = new Set(basketSeatsForShow.filter((s) => !initialSelection.includes(s)))
  const totalPrice = selected.size * ticketType.price

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-base">
              {ticketType.name} · {formatPrice(ticketType.price)}
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">Screen {screenNumber} — tap seats to select</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none ml-4">×</button>
        </div>

        {/* Seat map */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">Loading seat availability…</div>
          ) : (
            <>
              {/* Screen label */}
              <div className="flex justify-center mb-4">
                <div className="px-8 py-1.5 rounded-t-none rounded-b-lg bg-gray-600 text-gray-300 text-xs tracking-widest uppercase">
                  Screen
                </div>
              </div>

              {/* Rows */}
              <div className="space-y-1.5 min-w-max mx-auto">
                {seatPlan.map((row) => {
                  let seatCounter = 0
                  return (
                    <div key={row.label} className="flex items-center gap-1">
                      <span className="text-gray-500 text-xs w-5 text-right flex-shrink-0 mr-1">{row.label}</span>
                      {row.cells.map((cell, ci) => {
                        if (cell === 'gap') {
                          return <div key={ci} className="w-7 h-7 flex-shrink-0" />
                        }
                        seatCounter++
                        const seatId = `${row.label}${seatCounter}`
                        const isUnavailable = cell === 'unavailable'
                        const isTaken = takenSeats.has(seatId)
                        const isInBasket = basketSet.has(seatId)
                        const isSelected = selected.has(seatId)
                        const isDDA = cell === 'dda'
                        const isCompanion = cell === 'companion'
                        const isDisabled = isUnavailable || isTaken || isInBasket

                        let cls = 'w-7 h-7 rounded text-xs flex items-center justify-center flex-shrink-0 transition-colors font-medium '
                        if (isSelected) {
                          cls += 'bg-blue-500 text-white ring-2 ring-blue-300'
                        } else if (isTaken) {
                          cls += 'bg-red-900/60 text-red-600 cursor-not-allowed'
                        } else if (isInBasket) {
                          cls += 'bg-gray-500/40 text-gray-500 cursor-not-allowed'
                        } else if (isUnavailable) {
                          cls += 'bg-gray-900 text-gray-700 cursor-not-allowed'
                        } else if (isDDA) {
                          cls += 'bg-purple-800 hover:bg-purple-600 text-purple-200 cursor-pointer'
                        } else if (isCompanion) {
                          cls += 'bg-amber-700 hover:bg-amber-500 text-amber-100 cursor-pointer'
                        } else {
                          cls += 'bg-gray-600 hover:bg-gray-500 text-gray-300 cursor-pointer'
                        }

                        return (
                          <button
                            key={ci}
                            className={cls}
                            disabled={isDisabled}
                            onClick={() => toggle(seatId)}
                            title={seatId}
                          >
                            {isSelected ? '✓' : isDDA ? '♿' : isCompanion ? 'C' : ''}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

              {/* Companion warning */}
              {companionWarning && (
                <div className="mt-4 mx-auto max-w-xs bg-amber-900/40 border border-amber-700 rounded-lg px-3 py-2 text-amber-300 text-xs text-center">
                  Companion seats can only be sold alongside a wheelchair space.
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-5 justify-center text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-gray-600 inline-block" /> Standard
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-purple-800 inline-block" /> Wheelchair ♿
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-amber-700 inline-block" /> Companion
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-blue-500 inline-block" /> Selected
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-red-900/60 inline-block" /> Taken
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex-shrink-0">
          {selected.size > 0 && (
            <p className="text-gray-400 text-xs mb-2">
              Selected: {Array.from(selected).sort().join(', ')}
            </p>
          )}
          <button
            onClick={() => onConfirm(Array.from(selected))}
            disabled={selected.size === 0}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
          >
            {selected.size === 0
              ? 'Select seats to continue'
              : `Add ${selected.size} × ${ticketType.name} — ${formatPrice(totalPrice)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
