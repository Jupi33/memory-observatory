import type { Memory, MemoryResponse } from '../types/story'

export interface MemoryRepository {
  listMemories: () => Promise<Memory[]>
  saveMemory: (memory: Memory) => Promise<Memory>
  deleteMemory: (memoryId: string) => Promise<void>
  uploadMedia: (file: File) => Promise<string>
  addResponse: (
    memoryId: string,
    response: Omit<MemoryResponse, 'id' | 'createdAt'>,
  ) => Promise<MemoryResponse>
}
