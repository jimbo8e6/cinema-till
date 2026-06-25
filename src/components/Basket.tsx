import { useState } from 'react'
import { useBasketStore, useSettingsStore } from '../store'
import { supabase } from '../lib/supabase'
import { minutesToTime, formatPrice } from '../lib/utils'
import type { BasketItem } from '../types'

function itemLabel(item: BasketItem): string {
  if (item.kind === 'ticket') {
    return `${item.filmTitle} ${minutesToTime(item.startMinute)} · ${item.ticketLabel}`
  }
  return item.name
}

interface Props {
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Basket({ mobileOpen, onMobileClose }: Props) {
  const { items, removeItem, updateQty, clear, total } = useBasketStore()
  const syncCode = useSettingsStore((s) => s.syncCode)
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)

  const processPayment = async () => {
    if (!items.length || !syncCode) return
    setProcessing(true)
    const t = total()
    await supabase.from('transactions').insert({
      cinema_id: syncCode,
      items,
      total: t,
    })
    clear()
    setProcessing(false)
    setDone(true)
    setTimeout(() => {
      setDone(false)
      onMobileClose()
    }, 1500)
  }

  const basketContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
        <h2 className="text-white font-bold">
          Basket {items.length > 0 && <span className="text-gray-400 font-normal text-sm">({items.length})</span>}
        </h2>
        <div className="flex gap-2 items-center">
          {items.length > 0 && (
            <button
              onClick={clear}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={onMobileClose}
            className="sm:hidden text-gray-500 hover:text-gray-300 text-xl leading-none"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-gray-600 gap-1">
            <span className="text-2xl">🛒</span>
            <p className="text-sm">Basket is empty</p>
          </div>
        )}
        {items.map((item, idx) => (
          <div
            key={idx}
            className="bg-gray-800/60 rounded-lg p-3 flex gap-2 items-start"
          >
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm leading-tight">{itemLabel(item)}</p>
              <p className="text-blue-400 text-xs mt-0.5">{formatPrice(item.price)} each</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => updateQty(idx, item.quantity - 1)}
                className="w-6 h-6 rounded bg-gray-700 text-white text-sm flex items-center justify-center hover:bg-gray-600"
              >
                −
              </button>
              <span className="text-white text-sm w-4 text-center">{item.quantity}</span>
              <button
                onClick={() => updateQty(idx, item.quantity + 1)}
                className="w-6 h-6 rounded bg-gray-700 text-white text-sm flex items-center justify-center hover:bg-gray-600"
              >
                +
              </button>
              <button
                onClick={() => removeItem(idx)}
                className="w-6 h-6 rounded bg-gray-800 text-gray-500 hover:text-red-400 text-sm flex items-center justify-center ml-1"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-700 flex-shrink-0">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-400">Total</span>
          <span className="text-white text-xl font-bold">{formatPrice(total())}</span>
        </div>
        <button
          onClick={processPayment}
          disabled={!items.length || processing || done}
          className={`w-full font-bold py-4 rounded-xl text-white transition-all text-base ${
            done
              ? 'bg-green-600'
              : items.length
              ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-400'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {done ? '✓ Payment Complete' : processing ? 'Processing...' : 'Process Payment'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden sm:flex flex-col w-80 flex-shrink-0 bg-gray-900 border-l border-gray-700 h-full">
        {basketContent}
      </div>

      {/* Mobile slide-up panel */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 sm:hidden"
          onClick={onMobileClose}
        />
      )}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-gray-900 border-t border-gray-700 rounded-t-2xl transition-transform duration-300 ${
          mobileOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ height: '80vh' }}
      >
        {basketContent}
      </div>
    </>
  )
}
