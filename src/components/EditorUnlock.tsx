import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Heart } from 'lucide-react'
import { useAudioDirector } from '../audio/useAudioDirector'
import { useExperienceStore } from '../store/useExperienceStore'

const heartGlyph = '\u2665'

const heartSeeds = Array.from({ length: 13 }, (_, index) => ({
  id: `static-${index}`,
  x: ((index * 37) % 86) - 43,
  delay: (index % 6) * 0.045,
  size: 11 + (index % 5) * 2.2,
}))

export function EditorUnlock() {
  const bufferRef = useRef('')
  const pressTimer = useRef<number | null>(null)
  const [floatingHearts, setFloatingHearts] = useState<
    Array<{ id: string; x: number; delay: number; size: number }>
  >([])
  const editMode = useExperienceStore((state) => state.editMode)
  const setEditMode = useExperienceStore((state) => state.setEditMode)
  const { playCue } = useAudioDirector()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      bufferRef.current = `${bufferRef.current}${event.key.toLowerCase()}`.slice(-8)
      if (bufferRef.current.includes('demo')) {
        setEditMode(true)
        playCue('reveal')
        bufferRef.current = ''
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [playCue, setEditMode])

  const releaseHearts = useCallback(() => {
    const batch = Array.from({ length: 13 }, (_, index) => ({
      id: `${Date.now()}-${index}-${Math.random()}`,
      x: (Math.random() - 0.5) * 86,
      delay: Math.random() * 0.26,
      size: 10 + Math.random() * 12,
    }))
    setFloatingHearts((current) => [...current.slice(-18), ...batch])
    playCue('soft-click')
    window.setTimeout(() => {
      setFloatingHearts((current) => current.filter((heart) => !batch.some((item) => item.id === heart.id)))
    }, 2300)
  }, [playCue])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('.editor-seal')) releaseHearts()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [releaseHearts])

  const startPress = () => {
    pressTimer.current = window.setTimeout(() => {
      setEditMode(!editMode)
      playCue('reveal')
    }, 850)
  }

  const cancelPress = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current)
  }

  return (
    <button
      className="editor-seal"
      type="button"
      aria-label="Open editor"
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
    >
      <Heart size={18} fill="currentColor" />
      <span className="heart-float-field" aria-hidden>
        {heartSeeds.map((heart) => (
          <span
            key={heart.id}
            className="heart-float-static"
            style={
              {
                '--heart-x': `${heart.x}px`,
                '--heart-delay': `${heart.delay}s`,
                '--heart-size': `${heart.size}px`,
              } as CSSProperties
            }
          >
            {heartGlyph}
          </span>
        ))}
        {floatingHearts.map((heart) => (
          <span
            key={heart.id}
            className="heart-float"
            style={
              {
                '--heart-x': `${heart.x}px`,
                '--heart-delay': `${heart.delay}s`,
                '--heart-size': `${heart.size}px`,
              } as CSSProperties
            }
          >
            {heartGlyph}
          </span>
        ))}
      </span>
    </button>
  )
}
