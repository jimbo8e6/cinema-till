import { useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useScheduleStore, useSettingsStore } from '../store'
import type { ScheduleData } from '../types'

export function useSchedule() {
  const syncCode = useSettingsStore((s) => s.syncCode)
  const { setSchedule, setLoading, setError } = useScheduleStore()

  const load = useCallback(async () => {
    if (!syncCode) return
    setLoading(true)
    const { data, error } = await supabase
      .from('schedules')
      .select('data')
      .eq('id', syncCode)
      .single()
    if (error || !data) {
      setError(error?.message ?? 'Schedule not found')
      return
    }
    const schedule = data.data as ScheduleData
    // Scheduler stores seatPlans as {cols, rows, screen} objects — extract just the rows array
    const rawPlans = schedule.seatPlans ?? {}
    const seatPlans: Record<string, import('../types').SeatPlan> = {}
    for (const [key, val] of Object.entries(rawPlans)) {
      const v = val as any
      seatPlans[key] = Array.isArray(v) ? v : (v?.rows ?? [])
    }
    setSchedule(
      schedule.films ?? [],
      schedule.shows ?? [],
      schedule.ticketTypes ?? [],
      schedule.priceCards ?? [],
      schedule.screenCapacities ?? {},
      seatPlans,
    )
    setLoading(false)
  }, [syncCode])

  useEffect(() => { load() }, [load])

  return { reload: load }
}
