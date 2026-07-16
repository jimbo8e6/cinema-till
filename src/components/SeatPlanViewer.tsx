import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useSettingsStore } from '../store'
import { getSeatIdsByType } from '../lib/utils'
import type { SeatPlan, BasketTicket } from '../types'

interface Props {
  showId: string
  screenNumber: number
  filmTitle: string
  seatPlan: SeatPlan
  onClose: () => void
}

export function SeatPlanViewer({ showId, screenNumber, filmTitle, seatPlan, onClose }: Props) {
  const syncCode = useSettingsStore((s) => s.syncCode)
  const [takenSeats, setTakenSeats] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const ddaSeatIds = getSeatIdsByType(seatPlan, ['dda'])
  const companionSeatIds = getSeatIdsByType(seatPlan, ['companion'])
  const maxCols = seatPlan.reduce((m, row) => Math.max(m, row.cells.length), 0)

  const totalSeats = seatPlan.reduce(
    (sum, row) => sum + row.cells.filter((c) => c !== 'gap' && c !== 'unavailable').length,
    0
  )

  const fetchTaken = useCallback(async () => {
    const { data } = await supabase
      .from('transactions')
      .select('items')
      .eq('cinema_id', syncCode)

    const netQty = new Map<string, number>()
    for (const tx of data ?? []) {
      for (const item of tx.items as BasketTicket[]) {
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
  }, [showId, syncCode])

  useEffect(() => {
    fetchTaken()

    const channel = supabase
      .channel(`seat-viewer-${showId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchTaken()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchTaken, showId])

  const takenCount = takenSeats.size
  const availableCount = totalSeats - takenCount

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl shadow-2xl flex flex-col">

        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-base">{filmTitle}</h2>
            <p className="text-gray-400 text-xs mt-0.5">Screen {screenNumber} — seat availability</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none ml-4">×</button>
        </div>

        {/* Seat map */}
        <div className="p-3 sm:p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">Loading…</div>
          ) : (
            <>
              {/* Availability summary */}
              <div className="flex justify-center gap-4 mb-3 text-xs">
                <span className="text-gray-400">{availableCount} available</span>
                <span className="text-red-400">{takenCount} taken</span>
              </div>

              {/* Screen label */}
              <div className="flex justify-center mb-3">
                <div className="px-8 py-1 rounded-b-lg bg-gray-600 text-gray-300 text-[10px] tracking-widest uppercase">
                  Screen
                </div>
              </div>

              {/* CSS grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `1.25rem repeat(${maxCols}, 1fr)`,
                  gap: '2px',
                }}
              >
                {seatPlan.map((row) => {
                  let seatCounter = 0
                  const rowLabel = (
                    <span key={`lbl-${row.label}`} className="text-gray-500 text-[9px] self-center text-right pr-0.5">
                      {row.label}
                    </span>
                  )
                  const cells = row.cells.map((cell, ci) => {
                    if (cell === 'gap') {
                      return <div key={`${row.label}-gap-${ci}`} style={{ aspectRatio: '1' }} />
                    }
                    seatCounter++
                    const seatId = `${row.label}${seatCounter}`
                    const isTaken = takenSeats.has(seatId)
                    const isDDA = cell === 'dda'
                    const isCompanion = cell === 'companion'
                    const isUnavailable = cell === 'unavailable'

                    let cls = 'w-full rounded flex items-center justify-center font-medium text-[8px] overflow-hidden '
                    if (isTaken) {
                      cls += 'bg-red-900/60 text-red-500'
                    } else if (isUnavailable) {
                      cls += 'bg-gray-900 text-gray-700'
                    } else if (isDDA) {
                      cls += 'bg-purple-800 text-purple-200'
                    } else if (isCompanion) {
                      cls += 'bg-amber-700 text-amber-100'
                    } else {
                      cls += 'bg-gray-600 text-gray-300'
                    }

                    return (
                      <div
                        key={`${row.label}-${ci}`}
                        className={cls}
                        style={{ aspectRatio: '1' }}
                        title={seatId}
                      >
                        {!isTaken && isDDA ? '♿' : !isTaken && isCompanion ? 'C' : ''}
                      </div>
                    )
                  })
                  return [rowLabel, ...cells]
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-2 mt-3 justify-center text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-600 inline-block" /> Available</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-800 inline-block" /> Wheelchair</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-700 inline-block" /> Companion</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-900/60 inline-block" /> Taken</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
