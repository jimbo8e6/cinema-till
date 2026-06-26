import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSettingsStore } from '../store'
import { formatPrice } from '../lib/utils'
import type { BasketItem } from '../types'

interface Transaction {
  id: string
  created_at: string
  items: BasketItem[]
  total: number
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function transactionSummary(items: BasketItem[]): string {
  return items
    .map((i) => `${i.quantity}× ${i.kind === 'ticket' ? i.ticketLabel : i.name}`)
    .join(', ')
}

interface Props {
  onClose: () => void
}

export function RefundModal({ onClose }: Props) {
  const syncCode = useSettingsStore((s) => s.syncCode)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Transaction | null>(null)
  const [refunding, setRefunding] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase
      .from('transactions')
      .select('id, created_at, items, total')
      .eq('cinema_id', syncCode)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setTransactions((data as Transaction[]) ?? [])
        setLoading(false)
      })
  }, [syncCode])

  const processRefund = async () => {
    if (!selected) return
    setRefunding(true)
    // Write a refund record as a negative transaction
    await supabase.from('transactions').insert({
      cinema_id: syncCode,
      items: selected.items.map((i) => ({ ...i, quantity: -Math.abs(i.quantity) })),
      total: -Math.abs(selected.total),
    })
    setRefunding(false)
    setDone(true)
    setTimeout(() => {
      onClose()
    }, 1500)
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="p-5 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          {selected ? (
            <button
              onClick={() => setSelected(null)}
              className="text-blue-400 text-sm hover:text-blue-300"
            >
              ← Back
            </button>
          ) : (
            <h2 className="text-white font-bold text-lg">Refund</h2>
          )}
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Transaction list */}
        {!selected && (
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <p className="text-gray-500 text-sm text-center py-10">Loading transactions...</p>
            )}
            {!loading && transactions.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-10">No transactions found</p>
            )}
            {!loading && transactions.map((tx) => (
              <button
                key={tx.id}
                onClick={() => setSelected(tx)}
                className="w-full px-5 py-4 border-b border-gray-700 text-left hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium">
                      {formatDateTime(tx.created_at)}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5 truncate">
                      {transactionSummary(tx.items)}
                    </p>
                  </div>
                  <span className="text-white font-semibold text-sm flex-shrink-0">
                    {formatPrice(tx.total)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Transaction detail */}
        {selected && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="flex-1 p-5 space-y-2">
              <p className="text-gray-400 text-xs mb-3">{formatDateTime(selected.created_at)}</p>
              {selected.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-white text-sm">
                      {item.kind === 'ticket' ? item.ticketLabel : item.name}
                    </p>
                    {item.kind === 'ticket' && (
                      <p className="text-gray-500 text-xs truncate">{item.filmTitle}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-white text-sm">{item.quantity}× {formatPrice(item.price)}</p>
                    <p className="text-gray-400 text-xs">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-gray-700 flex-shrink-0">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400">Total paid</span>
                <span className="text-white font-bold text-lg">{formatPrice(selected.total)}</span>
              </div>
              <button
                onClick={processRefund}
                disabled={refunding || done}
                className={`w-full font-bold py-4 rounded-xl text-white transition-all text-base ${
                  done
                    ? 'bg-green-600'
                    : 'bg-red-600 hover:bg-red-500 active:bg-red-400 disabled:opacity-50'
                }`}
              >
                {done ? '✓ Refund Processed' : refunding ? 'Processing...' : `Refund ${formatPrice(selected.total)}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
