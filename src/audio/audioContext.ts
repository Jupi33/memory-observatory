import { createContext } from 'react'
import type { AudioCue } from '../types/story'

export interface AudioDirectorValue {
  unlock: () => void
  playCue: (cue: AudioCue) => void
  startPlaylist: () => void
  stopPlaylist: () => void
}

export const AudioDirectorContext = createContext<AudioDirectorValue | null>(null)
