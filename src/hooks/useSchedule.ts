import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useScheduleStore, useSettingsStore } from '../store'
import type { ScheduleData } from '../types'

export function useSchedule() {
  const syncCode = useSettingsStore((s) => s.syncCode)
  const { setSchedule, setLoading, setError } = useScheduleStore()

  useEffect(() => {
    if (!syncCode) return

    setLoading(true)
    supabase
      .from('schedules')
      .select('data')
      .eq('id', syncCode)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setError(error?.message ?? 'Schedule not found')
          return
        }
        const schedule = data.data as ScheduleData
        setSchedule(schedule.films ?? [], schedule.shows ?? [])
        setLoading(false)
      })
  }, [syncCode])
}
