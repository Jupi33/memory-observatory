import { useEffect } from 'react'
import type { Memory } from '../types/story'

export function useMemoryPreload(memories: Memory[]) {
  useEffect(() => {
    const preloaded = memories
      .filter((memory) => memory.mediaType === 'image')
      .map((memory) => {
        const image = new Image()
        image.decoding = 'async'
        image.src = memory.mediaUrl
        return image
      })

    return () => {
      preloaded.length = 0
    }
  }, [memories])
}
