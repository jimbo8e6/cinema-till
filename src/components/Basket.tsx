import { useRef, useState } from 'react'
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

// Quick-entry cash amounts above the total
function suggestedAmounts(total: number): number[] {
  const suggestions: number[] = []
  const steps = [0.50, 1, 2, 5, 10, 20, 50]
  for (const step of steps) {
    const candidate = Math.ceil(total / step) * step
    if (candidate >= total && !suggestions.includes(candidate)) {
      suggestions.push(candidate)
      if (suggestions.length === 4) break
    }
  }
  return suggestions
}

interface CashModalProps {
  total: number
  onConfirm: (method: 'cash') => void
  onClose: () => void
  processing: boolean
  done: boolean
}

function CashModal({ total, onConfirm, onClose, processing, done }: CashModalProps) {
  const [cashGiven, setCashGiven] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const cash = parseFloat(cashGiven) || 0
  const change = Math.round((cash - total) * 100) / 100
  const sufficient = cash >= total

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-5 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">Cash Payment</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Total due */}
          <div className="flex justify-between items-center bg-gray-700/50 rounded-xl px-4 py-3">
            <span className="text-gray-400 text-sm">Total due</span>
            <span className="text-white text-2xl font-bold">{formatPrice(total)}</span>
          </div>

          {/* Cash received input */}
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Cash received (£)</label>
            <input
              ref={inputRef}
              type="number"
              min="0"
              step="0.01"
              value={cashGiven}
              onChange={(e) => setCashGiven(e.target.value)}
              placeholder="0.00"
              autoFocus
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white text-2xl font-bold text-right focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600"
            />
          </div>

          {/* Quick-amount suggestions */}
          <div className="flex gap-2">
            {suggestedAmounts(total).map((amt) => (
              <button
                key={amt}
                onClick={() => setCashGiven(amt.toFixed(2))}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {formatPrice(amt)}
              </button>
            ))}
          </div>

          {/* Change display */}
          <div className={`flex justify-between items-center rounded-xl px-4 py-3 transition-colors ${
            cashGiven === ''
              ? 'bg-gray-700/30'
              : sufficient
              ? 'bg-green-900/40 border border-green-700'
              : 'bg-red-900/40 border border-red-700'
          }`}>
            <span className="text-gray-400 text-sm">
              {cashGiven === '' ? 'Change' : sufficient ? 'Change to give' : 'Short by'}
            </span>
            <span className={`text-2xl font-bold ${
              cashGiven === '' ? 'text-gray-600'
                : sufficient ? 'text-green-400'
                : 'text-red-400'
            }`}>
              {cashGiven === '' ? '—' : formatPrice(Math.abs(change))}
            </span>
          </div>

          {/* Confirm button */}
          <button
            onClick={() => onConfirm('cash')}
            disabled={!sufficient || processing || done}
            className={`w-full font-bold py-4 rounded-xl text-white transition-all text-base ${
              done
                ? 'bg-green-600'
                : sufficient
                ? 'bg-green-600 hover:bg-green-500 active:bg-green-400'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {done ? '✓ Payment Complete' : processing ? 'Processing...' : 'Confirm Cash Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface SplitModalProps {
  total: number
  onConfirm: (method: 'split') => void
  onClose: () => void
  processing: boolean
  done: boolean
}

function SplitModal({ total, onConfirm, onClose, processing, done }: SplitModalProps) {
  const [cashPortion, setCashPortion] = useState('')
  const [cashReceived, setCashReceived] = useState('')

  const cash = parseFloat(cashPortion) || 0
  const cardAmount = Math.round((total - cash) * 100) / 100
  const received = parseFloat(cashReceived) || 0
  const change = Math.round((received - cash) * 100) / 100

  const validSplit = cash > 0 && cash < total
  const sufficientCash = received >= cash

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-5 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">Split Payment</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Total */}
          <div className="flex justify-between items-center bg-gray-700/50 rounded-xl px-4 py-3">
            <span className="text-gray-400 text-sm">Total due</span>
            <span className="text-white text-2xl font-bold">{formatPrice(total)}</span>
          </div>

          {/* Cash portion entry */}
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Cash amount (£)</label>
            <input
              type="number"
              min="0"
              max={total}
              step="0.01"
              value={cashPortion}
              onChange={(e) => setCashPortion(e.target.value)}
              placeholder="0.00"
              autoFocus
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white text-2xl font-bold text-right focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-600"
            />
          </div>

          {/* Card remainder */}
          <div className="flex justify-between items-center bg-gray-700/30 rounded-xl px-4 py-3">
            <span className="text-gray-400 text-sm">💳 Card amount</span>
            <span className={`text-xl font-bold ${validSplit ? 'text-blue-400' : 'text-gray-600'}`}>
              {validSplit ? formatPrice(cardAmount) : '—'}
            </span>
          </div>

          {/* Cash received (only shown once a valid split is entered) */}
          {validSplit && (
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">Cash received (£)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white text-xl font-bold text-right focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-gray-600"
              />
            </div>
          )}

          {/* Change */}
          {validSplit && cashReceived !== '' && (
            <div className={`flex justify-between items-center rounded-xl px-4 py-3 transition-colors ${
              sufficientCash ? 'bg-green-900/40 border border-green-700' : 'bg-red-900/40 border border-red-700'
            }`}>
              <span className="text-gray-400 text-sm">{sufficientCash ? 'Change to give' : 'Short by'}</span>
              <span className={`text-xl font-bold ${sufficientCash ? 'text-green-400' : 'text-red-400'}`}>
                {formatPrice(Math.abs(change))}
              </span>
            </div>
          )}

          {/* Confirm */}
          <button
            onClick={() => onConfirm('split')}
            disabled={!validSplit || (cashReceived !== '' && !sufficientCash) || processing || done}
            className={`w-full font-bold py-4 rounded-xl text-white transition-all text-base ${
              done
                ? 'bg-green-600'
                : validSplit && (cashReceived === '' || sufficientCash)
                ? 'bg-purple-600 hover:bg-purple-500 active:bg-purple-400'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {done ? '✓ Payment Complete' : processing ? 'Processing...' : 'Confirm Split Payment'}
          </button>
        </div>
      </div>
    </div>
  )
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
  const [cashModalOpen, setCashModalOpen] = useState(false)
  const [splitModalOpen, setSplitModalOpen] = useState(false)

  const processPayment = async (method: 'card' | 'cash' | 'split') => {
    if (!items.length || !syncCode) return
    setProcessing(true)
    await supabase.from('transactions').insert({
      cinema_id: syncCode,
      items,
      total: total(),
      payment_method: method,
    })
    clear()
    setProcessing(false)
    setDone(true)
    setCashModalOpen(false)
    setSplitModalOpen(false)
    setTimeout(() => {
      setDone(false)
      onMobileClose()
    }, 1500)
  }

  const hasItems = items.length > 0

  const basketContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
        <h2 className="text-white font-bold">
          Basket {hasItems && <span className="text-gray-400 font-normal text-sm">({items.length})</span>}
        </h2>
        <div className="flex gap-2 items-center">
          {hasItems && (
            <button onClick={clear} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
              Clear
            </button>
          )}
          <button onClick={onMobileClose} className="sm:hidden text-gray-500 hover:text-gray-300 text-xl leading-none">
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!hasItems && (
          <div className="flex flex-col items-center justify-center h-32 text-gray-600 gap-1">
            <span className="text-2xl">🛒</span>
            <p className="text-sm">Basket is empty</p>
          </div>
        )}
        {items.map((item, idx) => (
          <div key={idx} className="bg-gray-800/60 rounded-lg p-3 flex gap-2 items-start">
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm leading-tight">{itemLabel(item)}</p>
              <p className="text-blue-400 text-xs mt-0.5">{formatPrice(item.price)} each</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => updateQty(idx, item.quantity - 1)}
                className="w-6 h-6 rounded bg-gray-700 text-white text-sm flex items-center justify-center hover:bg-gray-600"
              >−</button>
              <span className="text-white text-sm w-4 text-center">{item.quantity}</span>
              <button
                onClick={() => updateQty(idx, item.quantity + 1)}
                className="w-6 h-6 rounded bg-gray-700 text-white text-sm flex items-center justify-center hover:bg-gray-600"
              >+</button>
              <button
                onClick={() => removeItem(idx)}
                className="w-6 h-6 rounded bg-gray-800 text-gray-500 hover:text-red-400 text-sm flex items-center justify-center ml-1"
              >×</button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-700 flex-shrink-0">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-400">Total</span>
          <span className="text-white text-xl font-bold">{formatPrice(total())}</span>
        </div>

        {done ? (
          <div className="w-full bg-green-600 font-bold py-4 rounded-xl text-white text-center text-base">
            ✓ Payment Complete
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCashModalOpen(true)}
                disabled={!hasItems || processing}
                className="bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-4 rounded-xl transition-colors text-sm"
              >
                💵 Cash
              </button>
              <button
                onClick={() => processPayment('card')}
                disabled={!hasItems || processing}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-4 rounded-xl transition-colors text-sm"
              >
                {processing ? 'Processing...' : '💳 Card'}
              </button>
            </div>
            <button
              onClick={() => setSplitModalOpen(true)}
              disabled={!hasItems || processing}
              className="w-full bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-xl transition-colors text-sm"
            >
              ⇌ Split Cash + Card
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden sm:flex flex-col w-80 flex-shrink-0 bg-gray-900 border-l border-gray-700 overflow-hidden">
        {basketContent}
      </div>

      {/* Mobile slide-up panel */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 sm:hidden" onClick={onMobileClose} />
      )}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-gray-900 border-t border-gray-700 rounded-t-2xl transition-transform duration-300 ${
          mobileOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ height: '80vh' }}
      >
        {basketContent}
      </div>

      {cashModalOpen && (
        <CashModal
          total={total()}
          onConfirm={processPayment}
          onClose={() => setCashModalOpen(false)}
          processing={processing}
          done={done}
        />
      )}

      {splitModalOpen && (
        <SplitModal
          total={total()}
          onConfirm={processPayment}
          onClose={() => setSplitModalOpen(false)}
          processing={processing}
          done={done}
        />
      )}
    </>
  )
}
