import { lazy, Suspense } from 'react'
import { AudioDirectorProvider } from './audio/AudioDirector'
import { RitualConsole } from './entrance/RitualConsole'
import { EditorUnlock } from './components/EditorUnlock'
import { TopControls } from './components/TopControls'
import { useExperienceStore } from './store/useExperienceStore'

const OpeningPrelude = lazy(() =>
  import('./entrance/OpeningPrelude').then((module) => ({ default: module.OpeningPrelude })),
)
const CosmicObservatory = lazy(() =>
  import('./cosmic/CosmicObservatory').then((module) => ({ default: module.CosmicObservatory })),
)
const MemoryEditorOverlay = lazy(() =>
  import('./memories/MemoryEditorOverlay').then((module) => ({ default: module.MemoryEditorOverlay })),
)

function App() {
  const stage = useExperienceStore((state) => state.stage)
  const editMode = useExperienceStore((state) => state.editMode)

  return (
    <AudioDirectorProvider>
      <main className="app-shell">
        {stage === 'locked' && <RitualConsole />}
        <Suspense fallback={null}>
          {stage === 'intro' && <OpeningPrelude />}
          {stage === 'experience' && <CosmicObservatory />}
          {editMode && <MemoryEditorOverlay />}
        </Suspense>
        <TopControls />
        <EditorUnlock />
      </main>
    </AudioDirectorProvider>
  )
}

export default App
