export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export function todayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

export function formatPrice(p: number): string {
  return `£${p.toFixed(2)}`
}
