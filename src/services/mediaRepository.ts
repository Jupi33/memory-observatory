import { ApiClientError, hasApiBackend } from './apiClient'
import { apiMemoryRepository } from './apiMemoryRepository'
import { localMemoryRepository } from './localMemoryRepository'
import type { MemoryRepository } from './memoryRepositoryTypes'

const fallbackAllowed = (error: unknown) =>
  !(error instanceof ApiClientError) || (error.status !== 401 && error.status !== 403)

const withLocalFallback = async <T>(
  action: keyof MemoryRepository,
  remoteCall: () => Promise<T>,
  localCall: () => Promise<T>,
) => {
  if (!hasApiBackend) return localCall()

  try {
    return await remoteCall()
  } catch (error) {
    if (!fallbackAllowed(error)) throw error
    console.warn(`API ${String(action)} fallback:`, error)
    return localCall()
  }
}

export const mediaRepository: MemoryRepository = {
  listMemories: () =>
    withLocalFallback(
      'listMemories',
      () => apiMemoryRepository.listMemories(),
      () => localMemoryRepository.listMemories(),
    ),

  saveMemory: (memory) =>
    withLocalFallback(
      'saveMemory',
      () => apiMemoryRepository.saveMemory(memory),
      () => localMemoryRepository.saveMemory(memory),
    ),

  deleteMemory: (memoryId) =>
    withLocalFallback(
      'deleteMemory',
      () => apiMemoryRepository.deleteMemory(memoryId),
      () => localMemoryRepository.deleteMemory(memoryId),
    ),

  uploadMedia: (file) =>
    withLocalFallback(
      'uploadMedia',
      () => apiMemoryRepository.uploadMedia(file),
      () => localMemoryRepository.uploadMedia(file),
    ),

  addResponse: (memoryId, response) =>
    withLocalFallback(
      'addResponse',
      () => apiMemoryRepository.addResponse(memoryId, response),
      () => localMemoryRepository.addResponse(memoryId, response),
    ),
}
