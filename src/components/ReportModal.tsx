import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSettingsStore } from '../store'
import { todayDateString, formatPrice, minutesToTime } from '../lib/utils'
import type { BasketItem, BasketTicket, BasketConcession } from '../types'

interface Transaction {
  id: string
  created_at: string
  items: BasketItem[]
  total: number
  payment_method?: string
}

interface Props {
  onClose: () => void
}

type ReportType = 'tickets' | 'concessions'

// ─── Report generators ────────────────────────────────────────────────────────

function buildTicketsReport(date: string, transactions: Transaction[]): string {
  // Group ticket items by showId
  type ShowGroup = {
    filmTitle: string
    startMinute: number
    screenNumber: number
    byType: Record<string, { label: string; qty: number; price: number }>
  }
  const shows: Record<string, ShowGroup> = {}

  for (const tx of transactions) {
    for (const item of tx.items) {
      if (item.kind !== 'ticket') continue
      const t = item as BasketTicket
      if (!shows[t.showId]) {
        shows[t.showId] = {
          filmTitle: t.filmTitle,
          startMinute: t.startMinute,
          screenNumber: t.screenNumber,
          byType: {},
        }
      }
      const key = t.ticketTypeId
      if (!shows[t.showId].byType[key]) {
        shows[t.showId].byType[key] = { label: t.ticketLabel, qty: 0, price: t.price }
      }
      shows[t.showId].byType[key].qty += t.quantity
    }
  }

  const sorted = Object.values(shows).sort((a, b) => a.startMinute - b.startMinute)

  let grandTotal = 0
  let grandQty = 0

  const showRows = sorted.map((show) => {
    const types = Object.values(show.byType)
    const showTotal = types.reduce((s, t) => s + t.qty * t.price, 0)
    const showQty = types.reduce((s, t) => s + t.qty, 0)
    grandTotal += showTotal
    grandQty += showQty

    const typeRows = types
      .map(
        (t) => `
        <tr>
          <td style="padding:4px 12px 4px 24px;color:#555">${t.label}</td>
          <td style="padding:4px 12px;text-align:center;color:#555">${t.qty}</td>
          <td style="padding:4px 12px;text-align:right;color:#555">${formatPrice(t.price)}</td>
          <td style="padding:4px 12px;text-align:right;color:#555">${formatPrice(t.qty * t.price)}</td>
        </tr>`
      )
      .join('')

    return `
      <tr style="background:#f8f8f8">
        <td colspan="4" style="padding:8px 12px;font-weight:600">
          ${show.filmTitle}
          <span style="font-weight:400;color:#666;margin-left:8px">
            ${minutesToTime(show.startMinute)} · Screen ${show.screenNumber}
          </span>
        </td>
      </tr>
      ${typeRows}
      <tr style="border-top:1px solid #e5e5e5">
        <td style="padding:4px 12px"></td>
        <td style="padding:4px 12px;text-align:center;font-weight:600">${showQty}</td>
        <td style="padding:4px 12px"></td>
        <td style="padding:4px 12px;text-align:right;font-weight:600">${formatPrice(showTotal)}</td>
      </tr>`
  }).join('<tr><td colspan="4" style="padding:4px"></td></tr>')

  const refundTotal = transactions.filter((t) => t.total < 0).reduce((s, t) => s + t.total, 0)
  const cashTotal = transactions.filter((t) => t.payment_method === 'cash').reduce((s, t) => s + t.total, 0)
  const cardTotal = transactions.filter((t) => t.payment_method === 'card').reduce((s, t) => s + t.total, 0)

  const tableHtml = `
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="border-bottom:2px solid #222">
          <th style="padding:8px 12px;text-align:left">Film / Ticket Type</th>
          <th style="padding:8px 12px;text-align:center">Qty</th>
          <th style="padding:8px 12px;text-align:right">Unit Price</th>
          <th style="padding:8px 12px;text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>${showRows}</tbody>
      <tfoot>
        <tr style="border-top:2px solid #222;background:#f0f0f0">
          <td style="padding:10px 12px;font-weight:700">TOTAL</td>
          <td style="padding:10px 12px;text-align:center;font-weight:700">${grandQty}</td>
          <td></td>
          <td style="padding:10px 12px;text-align:right;font-weight:700;font-size:15px">${formatPrice(grandTotal)}</td>
        </tr>
      </tfoot>
    </table>
    ${buildTransactionLog(transactions)}`

  return printShell(`Tickets Report — ${formatDate(date)}`, tableHtml, grandTotal, grandQty, transactions.length, cashTotal, cardTotal, refundTotal)
}

function buildConcessionsReport(date: string, transactions: Transaction[]): string {
  const items: Record<string, { name: string; category: string; qty: number; price: number }> = {}

  for (const tx of transactions) {
    for (const item of tx.items) {
      if (item.kind !== 'concession') continue
      const c = item as BasketConcession
      if (!items[c.itemId]) {
        items[c.itemId] = { name: c.name, category: c.category, qty: 0, price: c.price }
      }
      items[c.itemId].qty += c.quantity
    }
  }

  // Group by category
  const byCategory: Record<string, typeof items[string][]> = {}
  for (const item of Object.values(items)) {
    if (!byCategory[item.category]) byCategory[item.category] = []
    byCategory[item.category].push(item)
  }

  let grandTotal = 0
  let grandQty = 0

  const categoryRows = Object.entries(byCategory).map(([category, catItems]) => {
    const catRows = catItems.map((item) => {
      const subtotal = item.qty * item.price
      grandTotal += subtotal
      grandQty += item.qty
      return `
        <tr>
          <td style="padding:6px 12px">${item.name}</td>
          <td style="padding:6px 12px;text-align:center">${item.qty}</td>
          <td style="padding:6px 12px;text-align:right">${formatPrice(item.price)}</td>
          <td style="padding:6px 12px;text-align:right">${formatPrice(subtotal)}</td>
        </tr>`
    }).join('')

    return `
      <tr style="background:#f8f8f8">
        <td colspan="4" style="padding:8px 12px;font-weight:600;text-transform:uppercase;font-size:11px;color:#666;letter-spacing:0.05em">${category}</td>
      </tr>
      ${catRows}`
  }).join('<tr><td colspan="4" style="padding:2px"></td></tr>')

  const noItems = Object.keys(items).length === 0
    ? '<tr><td colspan="4" style="padding:20px;text-align:center;color:#999">No concession sales for this date</td></tr>'
    : ''

  const refundTotal = transactions.filter((t) => t.total < 0).reduce((s, t) => s + t.total, 0)
  const cashTotal = transactions.filter((t) => t.payment_method === 'cash').reduce((s, t) => s + t.total, 0)
  const cardTotal = transactions.filter((t) => t.payment_method === 'card').reduce((s, t) => s + t.total, 0)

  const tableHtml = `
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="border-bottom:2px solid #222">
          <th style="padding:8px 12px;text-align:left">Item</th>
          <th style="padding:8px 12px;text-align:center">Qty</th>
          <th style="padding:8px 12px;text-align:right">Unit Price</th>
          <th style="padding:8px 12px;text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>${noItems || categoryRows}</tbody>
      <tfoot>
        <tr style="border-top:2px solid #222;background:#f0f0f0">
          <td style="padding:10px 12px;font-weight:700">TOTAL</td>
          <td style="padding:10px 12px;text-align:center;font-weight:700">${grandQty}</td>
          <td></td>
          <td style="padding:10px 12px;text-align:right;font-weight:700;font-size:15px">${formatPrice(grandTotal)}</td>
        </tr>
      </tfoot>
    </table>
    ${buildTransactionLog(transactions)}`

  return printShell(`Concessions Report — ${formatDate(date)}`, tableHtml, grandTotal, grandQty, transactions.length, cashTotal, cardTotal, refundTotal)
}

function buildTransactionLog(transactions: Transaction[]): string {
  if (transactions.length === 0) return ''

  const rows = transactions.map((tx) => {
    const time = new Date(tx.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    const summary = tx.items
      .map((i) => `${i.quantity}× ${i.kind === 'ticket' ? i.ticketLabel : i.name}`)
      .join(', ')
    const isRefund = tx.total < 0
    const isCash = tx.payment_method === 'cash'
    const isCard = tx.payment_method === 'card'
    const methodLabel = isRefund ? '↩ Refund' : isCash ? '💵 Cash' : isCard ? '💳 Card' : '—'
    const methodStyle = isRefund
      ? 'background:#fee2e2;color:#991b1b'
      : isCash
      ? 'background:#fef3c7;color:#92400e'
      : isCard
      ? 'background:#dbeafe;color:#1e3a8a'
      : 'background:#f5f5f5;color:#666'
    const totalStyle = isRefund ? 'color:#dc2626;font-weight:600' : 'font-weight:600'

    return `
      <tr style="border-bottom:1px solid #f0f0f0${isRefund ? ';background:#fff8f8' : ''}">
        <td style="padding:6px 12px;color:#555;white-space:nowrap;font-variant-numeric:tabular-nums">${time}</td>
        <td style="padding:6px 12px;color:#333;font-size:12px">${summary}</td>
        <td style="padding:6px 12px;white-space:nowrap">
          <span style="${methodStyle};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">${methodLabel}</span>
        </td>
        <td style="padding:6px 12px;text-align:right;white-space:nowrap;${totalStyle}">${formatPrice(tx.total)}</td>
      </tr>`
  }).join('')

  return `
    <h2 style="font-size:14px;font-weight:700;margin:32px 0 12px;padding-top:24px;border-top:2px solid #e5e5e5">Transaction Log</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="border-bottom:2px solid #222">
          <th style="padding:8px 12px;text-align:left;font-weight:600">Time</th>
          <th style="padding:8px 12px;text-align:left;font-weight:600">Items</th>
          <th style="padding:8px 12px;text-align:left;font-weight:600">Method</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function printShell(title: string, tableHtml: string, total: number, qty: number, txCount: number, cashTotal: number, cardTotal: number, refundTotal: number): string {
  const now = new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; color: #111; padding: 32px; font-size: 13px; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .meta { color: #666; font-size: 12px; margin-bottom: 24px; display: flex; gap: 16px; flex-wrap: wrap; }
    .summary { display: flex; gap: 24px; margin-bottom: 24px; padding: 12px 16px; background: #f5f5f5; border-radius: 6px; flex-wrap: wrap; }
    .summary-item { }
    .summary-item .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
    .summary-item .value { font-size: 18px; font-weight: 700; }
    .summary-divider { width: 1px; background: #ddd; align-self: stretch; }
    table { width: 100%; border-collapse: collapse; }
    @media print {
      body { padding: 16px; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">
    <span>Generated: ${now}</span>
    <span>Transactions: ${txCount}</span>
  </div>
  <div class="summary">
    <div class="summary-item">
      <div class="label">Total Revenue</div>
      <div class="value">${formatPrice(total)}</div>
    </div>
    <div class="summary-divider"></div>
    <div class="summary-item">
      <div class="label">💵 Cash</div>
      <div class="value">${formatPrice(cashTotal)}</div>
    </div>
    <div class="summary-item">
      <div class="label">💳 Card</div>
      <div class="value">${formatPrice(cardTotal)}</div>
    </div>
    ${refundTotal < 0 ? `<div class="summary-item">
      <div class="label">↩ Refunds</div>
      <div class="value" style="color:#dc2626">${formatPrice(refundTotal)}</div>
    </div>` : ''}
    <div class="summary-divider"></div>
    <div class="summary-item">
      <div class="label">Items Sold</div>
      <div class="value">${qty}</div>
    </div>
  </div>
  ${tableHtml}
  <script>window.onload = () => window.print()</script>
</body>
</html>`
}

// ─── Modal component ──────────────────────────────────────────────────────────

export function ReportModal({ onClose }: Props) {
  const syncCode = useSettingsStore((s) => s.syncCode)
  const [reportDate, setReportDate] = useState(todayDateString())
  const [loading, setLoading] = useState<ReportType | null>(null)

  const generate = async (type: ReportType) => {
    setLoading(type)

    // Fetch all transactions for the selected date
    const dayStart = `${reportDate}T00:00:00.000Z`
    const dayEnd = `${reportDate}T23:59:59.999Z`

    const { data } = await supabase
      .from('transactions')
      .select('id, created_at, items, total, payment_method')
      .eq('cinema_id', syncCode)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd)

    const transactions = (data as Transaction[]) ?? []
    const html = type === 'tickets'
      ? buildTicketsReport(reportDate, transactions)
      : buildConcessionsReport(reportDate, transactions)

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
    }

    setLoading(null)
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-5 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">Export Report</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-gray-400 text-xs block mb-1">Report date</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => e.target.value && setReportDate(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <p className="text-gray-400 text-xs">Select report</p>
            <button
              onClick={() => generate('tickets')}
              disabled={loading !== null}
              className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-3 rounded-xl flex items-center justify-between transition-colors"
            >
              <span>🎟️ Tickets Report</span>
              {loading === 'tickets' ? (
                <span className="text-gray-400 text-xs">Generating...</span>
              ) : (
                <span className="text-gray-500 text-xs">PDF ↗</span>
              )}
            </button>
            <button
              onClick={() => generate('concessions')}
              disabled={loading !== null}
              className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-3 rounded-xl flex items-center justify-between transition-colors"
            >
              <span>🍿 Concessions Report</span>
              {loading === 'concessions' ? (
                <span className="text-gray-400 text-xs">Generating...</span>
              ) : (
                <span className="text-gray-500 text-xs">PDF ↗</span>
              )}
            </button>
          </div>

          <p className="text-gray-600 text-xs text-center">
            Opens in a new tab — use Print → Save as PDF
          </p>
        </div>
      </div>
    </div>
  )
}
