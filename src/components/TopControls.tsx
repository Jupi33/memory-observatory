import { Volume2, VolumeX } from 'lucide-react'
import { useExperienceStore } from '../store/useExperienceStore'

export function TopControls() {
  const stage = useExperienceStore((state) => state.stage)
  const audioEnabled = useExperienceStore((state) => state.audioEnabled)
  const setAudioEnabled = useExperienceStore((state) => state.setAudioEnabled)

  if (stage === 'locked') return null

  return (
    <div className="top-controls">
      <button
        type="button"
        onClick={() => setAudioEnabled(!audioEnabled)}
        aria-label="Activar o desactivar audio"
      >
        {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
    </div>
  )
}
