import { create } from 'zustand'
import { hasApiBackend } from '../services/apiClient'
import { mediaRepository } from '../services/mediaRepository'
import type { ChapterId, ExperienceStage, Memory, MemoryCategory, RelationshipEra } from '../types/story'

interface NewMemoryInput {
  title: string
  description: string
  author: string
  chapter: ChapterId
  category: MemoryCategory
  era: RelationshipEra
  place: string
  mood: string
  linkedMemoryId?: string
  date?: string
  file?: File
}

interface ExperienceState {
  stage: ExperienceStage
  editMode: boolean
  editingMemoryId: string | null
  editorAuthOpen: boolean
  editorUnlocked: boolean
  pendingEditorMemoryId: string | null
  audioEnabled: boolean
  newbornMemoryId: string | null
  vanishingMemoryId: string | null
  memories: Memory[]
  loadingMemories: boolean
  setStage: (stage: ExperienceStage) => void
  setEditMode: (editMode: boolean) => void
  setEditorAuthOpen: (open: boolean) => void
  setEditorUnlocked: (unlocked: boolean) => void
  requestEditorAccess: (memoryId?: string) => void
  completeEditorAccess: () => void
  openEditorForMemory: (memoryId: string) => void
  setAudioEnabled: (audioEnabled: boolean) => void
  acknowledgeNewborn: () => void
  acknowledgeVanishing: () => void
  loadMemories: () => Promise<void>
  saveMemory: (memory: Memory) => Promise<void>
  createMemory: (input: NewMemoryInput) => Promise<void>
  deleteMemory: (memoryId: string) => Promise<void>
  addResponse: (memoryId: string, author: string, text: string) => Promise<void>
}

const importanceForCategory = (category: MemoryCategory) => (category === 'sacred' ? 3 : 1)

export const useExperienceStore = create<ExperienceState>((set, get) => ({
  stage: 'locked',
  editMode: false,
  editingMemoryId: null,
  editorAuthOpen: false,
  editorUnlocked: !hasApiBackend,
  pendingEditorMemoryId: null,
  audioEnabled: true,
  newbornMemoryId: null,
  vanishingMemoryId: null,
  memories: [],
  loadingMemories: false,
  setStage: (stage) => set({ stage }),
  setEditMode: (editMode) => set({ editMode, editingMemoryId: editMode ? get().editingMemoryId : null }),
  setEditorAuthOpen: (open) =>
    set({ editorAuthOpen: open, pendingEditorMemoryId: open ? get().pendingEditorMemoryId : null }),
  setEditorUnlocked: (unlocked) => set({ editorUnlocked: unlocked }),
  requestEditorAccess: (memoryId) => {
    const state = get()
    if (!hasApiBackend || state.editorUnlocked) {
      set({ editMode: true, editingMemoryId: memoryId ?? null })
      return
    }
    set({ editorAuthOpen: true, pendingEditorMemoryId: memoryId ?? null })
  },
  completeEditorAccess: () => {
    const pendingEditorMemoryId = get().pendingEditorMemoryId
    set({
      editorUnlocked: true,
      editorAuthOpen: false,
      editMode: true,
      editingMemoryId: pendingEditorMemoryId,
      pendingEditorMemoryId: null,
    })
  },
  openEditorForMemory: (memoryId) => set({ editMode: true, editingMemoryId: memoryId }),
  setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
  acknowledgeNewborn: () => set({ newbornMemoryId: null }),
  acknowledgeVanishing: () => set({ vanishingMemoryId: null }),
  loadMemories: async () => {
    set({ loadingMemories: true })
    const memories = await mediaRepository.listMemories()
    set({ memories, loadingMemories: false })
  },
  saveMemory: async (memory) => {
    const saved = await mediaRepository.saveMemory(memory)
    set({
      memories: get()
        .memories.map((item) => (item.id === saved.id ? saved : item))
        .sort((a, b) => a.order - b.order),
    })
  },
  createMemory: async (input) => {
    const previewUrl = input.file
      ? URL.createObjectURL(input.file)
      : '/media/placeholders/placeholder-memory.svg'
    const mediaType = input.file?.type.startsWith('video') ? 'video' : 'image'
    const now = new Date().toISOString()
    const memory: Memory = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description,
      author: input.author,
      chapter: input.chapter,
      category: input.category,
      era: input.era,
      place: input.place,
      importance: importanceForCategory(input.category),
      mediaUrl: previewUrl,
      mediaType,
      mood: input.mood,
      linkedMemoryId: input.linkedMemoryId,
      date: input.date ?? '',
      order: get().memories.length + 1,
      responses: [],
      createdAt: now,
      updatedAt: now,
    }

    set({
      memories: [...get().memories, memory].sort((a, b) => a.order - b.order),
      newbornMemoryId: memory.id,
    })

    const persistMemory = async () => {
      try {
        const uploadedUrl = input.file ? await mediaRepository.uploadMedia(input.file) : previewUrl
        const saved = await mediaRepository.saveMemory({
          ...memory,
          mediaUrl: uploadedUrl,
          updatedAt: new Date().toISOString(),
        })
        set({
          memories: get()
            .memories.map((item) => (item.id === saved.id ? saved : item))
            .sort((a, b) => a.order - b.order),
        })
      } catch (error) {
        console.warn('Memory background persistence failed:', error)
      } finally {
        if (input.file) {
          window.setTimeout(() => URL.revokeObjectURL(previewUrl), 15000)
        }
      }
    }

    void persistMemory()
  },
  deleteMemory: async (memoryId) => {
    set({ vanishingMemoryId: memoryId })
    await mediaRepository.deleteMemory(memoryId)
    set({
      memories: get()
        .memories.filter((memory) => memory.id !== memoryId)
        .map((memory) =>
          memory.linkedMemoryId === memoryId ? { ...memory, linkedMemoryId: undefined } : memory,
        ),
    })
  },
  addResponse: async (memoryId, author, text) => {
    const response = await mediaRepository.addResponse(memoryId, { memoryId, author, text })
    set({
      memories: get().memories.map((memory) =>
        memory.id === memoryId ? { ...memory, responses: [...memory.responses, response] } : memory,
      ),
    })
  },
}))
