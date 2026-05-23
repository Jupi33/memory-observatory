import { AudioDirectorProvider } from './audio/AudioDirector'
import { OpeningPrelude } from './entrance/OpeningPrelude'
import { RitualConsole } from './entrance/RitualConsole'
import { CosmicObservatory } from './cosmic/CosmicObservatory'
import { MemoryEditorOverlay } from './memories/MemoryEditorOverlay'
import { EditorUnlock } from './components/EditorUnlock'
import { TopControls } from './components/TopControls'
import { useExperienceStore } from './store/useExperienceStore'

function App() {
  const stage = useExperienceStore((state) => state.stage)

  return (
    <AudioDirectorProvider>
      <main className="app-shell">
        {stage === 'locked' && <RitualConsole />}
        {stage === 'intro' && <OpeningPrelude />}
        {stage === 'experience' && <CosmicObservatory />}
        <TopControls />
        <EditorUnlock />
        <MemoryEditorOverlay />
      </main>
    </AudioDirectorProvider>
  )
}

export default App
