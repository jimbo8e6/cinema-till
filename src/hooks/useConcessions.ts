import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useConcessionStore, useSettingsStore } from '../store'

export function useConcessions() {
  const syncCode = useSettingsStore((s) => s.syncCode)
  const { setItems, setLoading } = useConcessionStore()

  const load = async () => {
    if (!syncCode) return
    setLoading(true)
    const { data } = await supabase
      .from('concession_items')
      .select('*')
      .eq('cinema_id', syncCode)
      .order('category')
      .order('name')
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [syncCode])

  return { reload: load }
}
