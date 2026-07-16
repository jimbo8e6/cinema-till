export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export function todayDateString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatPrice(p: number): string {
  return `£${p.toFixed(2)}`
}

// Returns the set of seat IDs (e.g. "A1", "B3") whose cell type matches any of the given types.
export function getSeatIdsByType(plan: import('../types').SeatPlan, types: import('../types').SeatCell[]): Set<string> {
  const result = new Set<string>()
  for (const row of plan) {
    let counter = 0
    for (const cell of row.cells) {
      if (cell === 'gap') continue
      counter++
      if ((types as string[]).includes(cell)) result.add(`${row.label}${counter}`)
    }
  }
  return result
}
