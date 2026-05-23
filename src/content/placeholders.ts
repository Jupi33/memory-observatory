import type { MediaSlot } from '../types/story'

const placeholder = '/media/placeholders/placeholder-memory.svg'

export const introPlaceholders: MediaSlot[] = Array.from({ length: 12 }, (_, index) => ({
  id: `intro-${String(index + 1).padStart(2, '0')}`,
  src: `/media/intro/intro-${String(index + 1).padStart(2, '0')}.jpg`,
  alt: `Demo intro frame ${index + 1}. Replace this file with production media outside the public repository.`,
  chapter: index < 4 ? 'montage' : index < 8 ? 'galaxy' : 'memory-room',
  intensity: 0.55 + (index % 4) * 0.12,
}))

export const fallbackIntroFrames: MediaSlot[] = introPlaceholders.map((slot) => ({
  ...slot,
  src: placeholder,
}))

export const placeholderMedia = placeholder
