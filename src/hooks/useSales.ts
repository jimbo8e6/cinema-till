import { useEffect, useCallback } from 'react'
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useSettingsStore } from '../store'
import type { BasketTicket } from '../types'

export interface ShowSales {
  total: number
  byType: { label: string; quantity: number }[]
}

interface SalesState {
  salesByShow: Record<string, ShowSales>
  setSales: (map: Record<string, ShowSales>) => void
}

export const useSalesStore = create<SalesState>((set) => ({
  salesByShow: {},
  setSales: (salesByShow) => set({ salesByShow }),
}))

export function useSales() {
  const syncCode = useSettingsStore((s) => s.syncCode)
  const setSales = useSalesStore((s) => s.setSales)

  const load = useCallback(async () => {
    if (!syncCode) return
    const { data } = await supabase
      .from('transactions')
      .select('items')
      .eq('cinema_id', syncCode)

    if (!data) return

    const map: Record<string, ShowSales> = {}
    for (const row of data) {
      const tickets = (row.items as BasketTicket[]).filter((i) => i.kind === 'ticket')
      for (const item of tickets) {
        if (!map[item.showId]) map[item.showId] = { total: 0, byType: [] }
        map[item.showId].total += item.quantity
        const existing = map[item.showId].byType.find((b) => b.label === item.ticketLabel)
        if (existing) {
          existing.quantity += item.quantity
        } else {
          map[item.showId].byType.push({ label: item.ticketLabel, quantity: item.quantity })
        }
      }
    }
    setSales(map)
  }, [syncCode])

  useEffect(() => { load() }, [load])

  return { reload: load }
}
