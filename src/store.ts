import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BasketItem, ConcessionItem, Film, PriceCard, SchedulerTicketType, Show } from './types'

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
  ticketTypes: SchedulerTicketType[]
  priceCards: PriceCard[]
  loading: boolean
  error: string | null
  setSchedule: (films: Film[], shows: Show[], ticketTypes: SchedulerTicketType[], priceCards: PriceCard[]) => void
  setLoading: (v: boolean) => void
  setError: (msg: string | null) => void
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  films: [],
  shows: [],
  ticketTypes: [],
  priceCards: [],
  loading: false,
  error: null,
  setSchedule: (films, shows, ticketTypes, priceCards) =>
    set({ films, shows, ticketTypes, priceCards, error: null }),
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
  addTicket: (show: Show, film: Film, ticketTypeId: string, ticketLabel: string, price: number, qty: number) => void
  addConcession: (item: ConcessionItem, qty: number) => void
  removeItem: (index: number) => void
  updateQty: (index: number, qty: number) => void
  clear: () => void
  total: () => number
}

export const useBasketStore = create<BasketState>((set, get) => ({
  items: [],

  addTicket: (show, film, ticketTypeId, ticketLabel, price, qty) => {
    const existingIdx = get().items.findIndex(
      (i) => i.kind === 'ticket' && i.showId === show.id && i.ticketTypeId === ticketTypeId
    )
    if (existingIdx >= 0) {
      const updated = [...get().items]
      updated[existingIdx] = {
        ...updated[existingIdx],
        quantity: (updated[existingIdx] as BasketTicket).quantity + qty,
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
            ticketTypeId,
            ticketLabel,
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

  removeItem: (index) => set({ items: get().items.filter((_, i) => i !== index) }),

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

  total: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
}))

