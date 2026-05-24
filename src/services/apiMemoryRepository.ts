import type { Memory, MemoryResponse } from '../types/story'
import { ApiClientError, apiRequest } from './apiClient'
import type { MemoryRepository } from './memoryRepositoryTypes'

interface MemoryListResponse {
  ok: boolean
  memories: Memory[]
}

interface MemoryWriteResponse {
  ok: boolean
  memory: Memory
}

interface ResponseWriteResponse {
  ok: boolean
  response: MemoryResponse
}

interface UploadUrlResponse {
  ok: boolean
  uploadUrl: string
  publicUrl: string
  method: 'PUT'
}

const uploadWithSignedUrl = async (uploadUrl: string, file: File) => {
  const body = new FormData()
  body.append('cacheControl', '31536000')
  body.append('', file)

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body,
  })

  if (!response.ok) {
    throw new ApiClientError(`Signed upload failed with ${response.status}`, response.status)
  }
}

export const apiMemoryRepository: MemoryRepository = {
  async listMemories() {
    const result = await apiRequest<MemoryListResponse>('/memories')
    return result.memories
  },

  async saveMemory(memory) {
    const result = await apiRequest<MemoryWriteResponse>('/memories', {
      method: 'PATCH',
      body: JSON.stringify(memory),
    })
    return result.memory
  },

  async deleteMemory(memoryId) {
    await apiRequest<{ ok: boolean }>('/memories', {
      method: 'DELETE',
      body: JSON.stringify({ id: memoryId }),
    })
  },

  async uploadMedia(file) {
    const upload = await apiRequest<UploadUrlResponse>('/media/upload-url', {
      method: 'POST',
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      }),
    })
    await uploadWithSignedUrl(upload.uploadUrl, file)
    return upload.publicUrl
  },

  async addResponse(memoryId, response) {
    const result = await apiRequest<ResponseWriteResponse>(
      `/memories/${encodeURIComponent(memoryId)}/responses`,
      {
        method: 'POST',
        body: JSON.stringify(response),
      },
    )
    return result.response
  },
}
