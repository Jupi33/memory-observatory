import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { Heart, KeyRound, X } from 'lucide-react'
import { useAudioDirector } from '../audio/useAudioDirector'
import { useModalFocus } from '../hooks/useModalFocus'
import { editorSessionRepository } from '../services/editorSession'
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
  const dialogRef = useRef<HTMLFormElement | null>(null)
  const pressTimer = useRef<number | null>(null)
  const [secret, setSecret] = useState('')
  const [authError, setAuthError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [floatingHearts, setFloatingHearts] = useState<
    Array<{ id: string; x: number; delay: number; size: number }>
  >([])
  const editMode = useExperienceStore((state) => state.editMode)
  const editorAuthOpen = useExperienceStore((state) => state.editorAuthOpen)
  const setEditMode = useExperienceStore((state) => state.setEditMode)
  const setEditorAuthOpen = useExperienceStore((state) => state.setEditorAuthOpen)
  const setEditorUnlocked = useExperienceStore((state) => state.setEditorUnlocked)
  const requestEditorAccess = useExperienceStore((state) => state.requestEditorAccess)
  const completeEditorAccess = useExperienceStore((state) => state.completeEditorAccess)
  const { playCue } = useAudioDirector()

  const closeAuth = useCallback(() => {
    setEditorAuthOpen(false)
    setAuthError('')
    setSecret('')
  }, [setEditorAuthOpen])

  useModalFocus({ active: editorAuthOpen, containerRef: dialogRef, onClose: closeAuth })

  useEffect(() => {
    if (!editorSessionRepository.hasBackend) return
    void editorSessionRepository
      .status()
      .then((session) => setEditorUnlocked(session.authenticated))
      .catch(() => setEditorUnlocked(false))
  }, [setEditorUnlocked])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (editorAuthOpen) return
      bufferRef.current = `${bufferRef.current}${event.key.toLowerCase()}`.slice(-8)
      if (bufferRef.current.includes('demo')) {
        requestEditorAccess()
        playCue('reveal')
        bufferRef.current = ''
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editorAuthOpen, playCue, requestEditorAccess])

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
      pressTimer.current = null
      if (editMode) {
        setEditMode(false)
      } else {
        requestEditorAccess()
      }
      playCue('reveal')
    }, 850)
  }

  const cancelPress = () => {
    if (!pressTimer.current) return
    window.clearTimeout(pressTimer.current)
    pressTimer.current = null
  }

  const submitSecret = async (event: FormEvent) => {
    event.preventDefault()
    if (!secret.trim()) return

    setSubmitting(true)
    setAuthError('')
    try {
      const authenticated = await editorSessionRepository.login(secret)
      if (!authenticated) {
        setAuthError('La clave no abrió el archivo.')
        return
      }
      setSecret('')
      completeEditorAccess()
      playCue('reveal')
    } catch {
      setAuthError('No se pudo validar la clave.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        className="editor-seal"
        type="button"
        aria-label="Abrir editor"
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

      {editorAuthOpen && (
        <div className="editor-auth" role="dialog" aria-modal="true" aria-labelledby="editor-auth-title">
          <form className="editor-auth__panel" ref={dialogRef} tabIndex={-1} onSubmit={submitSecret}>
            <button
              type="button"
              className="editor-auth__close"
              onClick={closeAuth}
              aria-label="Cerrar clave"
            >
              <X size={17} />
            </button>
            <p>archivo privado</p>
            <h2 id="editor-auth-title">Clave de editor</h2>
            <label>
              Escribe la clave para crear o cambiar recuerdos.
              <input
                type="password"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                autoComplete="current-password"
                placeholder="clave privada"
              />
            </label>
            {authError && (
              <span className="editor-auth__error" role="alert">
                {authError}
              </span>
            )}
            <button className="editor-auth__submit" type="submit" disabled={!secret.trim() || submitting}>
              <KeyRound size={16} />
              {submitting ? 'validando...' : 'abrir editor'}
            </button>
          </form>
        </div>
      )}
    </>
  )
}
