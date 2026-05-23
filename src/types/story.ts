export type ExperienceStage = 'locked' | 'intro' | 'experience'

export type MediaType = 'image' | 'video'

export type ChapterId = 'boot' | 'montage' | 'galaxy' | 'memory-room' | 'capsule'

export type MemoryCategory = 'sacred' | 'daily' | 'future'

export type RelationshipEra = 'origin' | 'becoming' | 'present' | 'future'

export type DatePrecision = 'day' | 'month' | 'year' | 'unknown'

export type CosmicView = 'atlas' | 'trajectory' | 'letter'

export type AudioCue =
  | 'boot'
  | 'keypress'
  | 'deny'
  | 'accept'
  | 'glitch'
  | 'reveal'
  | 'soft-click'
  | 'memory'
  | 'photo-cut'
  | 'slow-blink'
  | 'piano'
  | 'star-born'
  | 'thread-draw'
  | 'memory-open'
  | 'crystal-break'

export interface TextBeat {
  at: number
  text: string
  tone?: 'whisper' | 'signal' | 'promise'
}

export interface CameraBeat {
  at: number
  zoom: number
  x: number
  y: number
  rotate: number
}

export interface MediaSlot {
  id: string
  src: string
  alt: string
  chapter: ChapterId
  intensity: number
}

export interface SceneDefinition {
  id: ChapterId
  title: string
  kicker: string
  body: string
  duration: number
  audioCue: AudioCue
  transitionIn: 'iris' | 'split' | 'glitch' | 'zoom' | 'fade'
  transitionOut: 'iris' | 'split' | 'glitch' | 'zoom' | 'fade'
  cameraBeats: CameraBeat[]
  textBeats: TextBeat[]
  mediaSlots: MediaSlot[]
}

export interface MemoryResponse {
  id: string
  memoryId: string
  author: string
  text: string
  createdAt: string
}

export interface Memory {
  id: string
  title: string
  description: string
  author: string
  chapter: ChapterId
  category: MemoryCategory
  era: RelationshipEra
  place: string
  importance: number
  mediaUrl: string
  mediaType: MediaType
  mood: string
  linkedMemoryId?: string
  date?: string
  order: number
  hidden?: boolean
  responses: MemoryResponse[]
  createdAt: string
  updatedAt: string
}

export interface RelationshipMilestone {
  id: string
  date: string
  title: string
  body: string
  kind: 'beginning' | 'birthday' | 'kiss' | 'symbol' | 'future'
  constellationWeight: number
}

export interface SkyMoment {
  id: string
  date: string
  label: string
  x: number
  y: number
  magnitude: number
  tone: 'violet' | 'wine' | 'ivory'
}
