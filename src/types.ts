// Scheduler data types (read from schedules table)
export interface Film {
  id: string
  title: string
  runtime: number // minutes, excluding trailers
  poster: string | null
  year: number
  color: string
}

export interface Show {
  id: string
  filmId: string
  screen: 1 | 2 | 3
  date: string // YYYY-MM-DD
  startMinute: number // minutes from midnight
  isOpen: boolean
  isFixed: boolean
  isSenior: boolean
  screeningType: string
}

export interface ScheduleData {
  shows: Show[]
  films: Film[]
}

// Ticket types
export type TicketType = 'adult' | 'concession' | 'child' | 'senior'

export interface TicketPrice {
  type: TicketType
  label: string
  price: number
}

// Concession items (from concession_items table)
export interface ConcessionItem {
  id: string
  cinema_id: string
  name: string
  price: number
  category: string
  is_available: boolean
}

// Basket items
export interface BasketTicket {
  kind: 'ticket'
  showId: string
  filmTitle: string
  screenNumber: number
  startMinute: number
  date: string
  ticketType: TicketType
  ticketLabel: string
  price: number
  quantity: number
}

export interface BasketConcession {
  kind: 'concession'
  itemId: string
  name: string
  category: string
  price: number
  quantity: number
}

export type BasketItem = BasketTicket | BasketConcession

// Transaction (written to transactions table)
export interface Transaction {
  id: string
  cinema_id: string
  created_at: string
  items: BasketItem[]
  total: number
}
