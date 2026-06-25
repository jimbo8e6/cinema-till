import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BasketItem, ConcessionItem, Film, Show, TicketType } from './types'

const TICKET_PRICES: Record<TicketType, { label: string; price: number }> = {
  adult: { label: 'Adult', price: 12.50 },
  concession: { label: 'Concession', price: 9.00 },
  child: { label: 'Child', price: 7.50 },
  senior: { label: 'Senior', price: 9.00 },
}

interface SettingsState {
  syncCode: string
  setSyncCode: (code: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      syncCode: '',
      setSyncCode: (code) => set({ syncCode: code }),
    }),
    { name: 'cinema-till-settings' }
  )
)

interface ScheduleState {
  films: Film[]
  shows: Show[]
  loading: boolean
  error: string | null
  setSchedule: (films: Film[], shows: Show[]) => void
  setLoading: (v: boolean) => void
  setError: (msg: string | null) => void
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  films: [],
  shows: [],
  loading: false,
  error: null,
  setSchedule: (films, shows) => set({ films, shows, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}))

interface ConcessionState {
  items: ConcessionItem[]
  loading: boolean
  setItems: (items: ConcessionItem[]) => void
  setLoading: (v: boolean) => void
}

export const useConcessionStore = create<ConcessionState>((set) => ({
  items: [],
  loading: false,
  setItems: (items) => set({ items }),
  setLoading: (loading) => set({ loading }),
}))

interface BasketState {
  items: BasketItem[]
  addTicket: (show: Show, film: Film, ticketType: TicketType, qty: number) => void
  addConcession: (item: ConcessionItem, qty: number) => void
  removeItem: (index: number) => void
  updateQty: (index: number, qty: number) => void
  clear: () => void
  total: () => number
}

export const useBasketStore = create<BasketState>((set, get) => ({
  items: [],

  addTicket: (show, film, ticketType, qty) => {
    const { label, price } = TICKET_PRICES[ticketType]
    const existingIdx = get().items.findIndex(
      (i) =>
        i.kind === 'ticket' &&
        i.showId === show.id &&
        i.ticketType === ticketType
    )
    if (existingIdx >= 0) {
      const updated = [...get().items]
      updated[existingIdx] = {
        ...updated[existingIdx],
        quantity: (updated[existingIdx] as BasketItem & { quantity: number }).quantity + qty,
      }
      set({ items: updated })
    } else {
      set({
        items: [
          ...get().items,
          {
            kind: 'ticket',
            showId: show.id,
            filmTitle: film.title,
            screenNumber: show.screen,
            startMinute: show.startMinute,
            date: show.date,
            ticketType,
            ticketLabel: label,
            price,
            quantity: qty,
          },
        ],
      })
    }
  },

  addConcession: (item, qty) => {
    const existingIdx = get().items.findIndex(
      (i) => i.kind === 'concession' && i.itemId === item.id
    )
    if (existingIdx >= 0) {
      const updated = [...get().items]
      updated[existingIdx] = {
        ...updated[existingIdx],
        quantity: (updated[existingIdx] as BasketItem & { quantity: number }).quantity + qty,
      }
      set({ items: updated })
    } else {
      set({
        items: [
          ...get().items,
          {
            kind: 'concession',
            itemId: item.id,
            name: item.name,
            category: item.category,
            price: item.price,
            quantity: qty,
          },
        ],
      })
    }
  },

  removeItem: (index) => {
    const updated = get().items.filter((_, i) => i !== index)
    set({ items: updated })
  },

  updateQty: (index, qty) => {
    if (qty <= 0) {
      get().removeItem(index)
      return
    }
    const updated = [...get().items]
    updated[index] = { ...updated[index], quantity: qty }
    set({ items: updated })
  },

  clear: () => set({ items: [] }),

  total: () =>
    get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
}))

export const TICKET_PRICES_MAP = TICKET_PRICES
