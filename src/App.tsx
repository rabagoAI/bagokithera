import { Scene } from './scene/Scene'
import { ControlPanel } from './ui/ControlPanel'
import { HintPanel } from './ui/HintPanel'

export default function App() {
  return (
    <main className="relative h-full w-full bg-abyss">
      <Scene />
      <HintPanel />
      <ControlPanel />
    </main>
  )
}
