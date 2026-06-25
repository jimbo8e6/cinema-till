import { useSettingsStore } from './store'
import { SetupScreen } from './components/SetupScreen'
import { TillApp } from './components/TillApp'

export default function App() {
  const syncCode = useSettingsStore((s) => s.syncCode)
  return syncCode ? <TillApp /> : <SetupScreen />
}
