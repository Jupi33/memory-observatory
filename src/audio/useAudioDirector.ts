import { useContext } from 'react'
import { AudioDirectorContext } from './audioContext'

export const useAudioDirector = () => {
  const value = useContext(AudioDirectorContext)
  if (!value) throw new Error('useAudioDirector must be used inside AudioDirectorProvider')
  return value
}
