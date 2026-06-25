import { useState } from 'react'
import { useBasketStore, TICKET_PRICES_MAP } from '../store'
import { minutesToTime, formatPrice } from '../lib/utils'
import type { Film, Show, TicketType } from '../types'

interface Props {
  show: Show
  film: Film
  onClose: () => void
}

const TICKET_TYPES: TicketType[] = ['adult', 'concession', 'child', 'senior']

export function TicketSelector({ show, film, onClose }: Props) {
  const [quantities, setQuantities] = useState<Record<TicketType, number>>({
    adult: 0,
    concession: 0,
    child: 0,
    senior: 0,
  })
  const addTicket = useBasketStore((s) => s.addTicket)

  const total = TICKET_TYPES.reduce(
    (sum, t) => sum + quantities[t] * TICKET_PRICES_MAP[t].price,
    0
  )
  const hasItems = TICKET_TYPES.some((t) => quantities[t] > 0)

  const adjust = (type: TicketType, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [type]: Math.max(0, prev[type] + delta),
    }))
  }

  const confirm = () => {
    TICKET_TYPES.forEach((t) => {
      if (quantities[t] > 0) addTicket(show, film, t, quantities[t])
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
          {TICKET_TYPES.map((type) => {
            const { label, price } = TICKET_PRICES_MAP[type]
            return (
              <div key={type} className="flex items-center justify-between">
                <div>
                  <span className="text-white font-medium">{label}</span>
                  <span className="text-gray-400 text-sm ml-2">{formatPrice(price)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => adjust(type, -1)}
                    className="w-9 h-9 rounded-full bg-gray-700 text-white text-xl flex items-center justify-center hover:bg-gray-600 active:bg-gray-500"
                  >
                    −
                  </button>
                  <span className="text-white w-5 text-center font-semibold">
                    {quantities[type]}
                  </span>
                  <button
                    onClick={() => adjust(type, 1)}
                    className="w-9 h-9 rounded-full bg-blue-600 text-white text-xl flex items-center justify-center hover:bg-blue-500 active:bg-blue-400"
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>

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
