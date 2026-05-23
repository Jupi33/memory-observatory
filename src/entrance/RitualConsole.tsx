import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'motion/react'
import { useAudioDirector } from '../audio/useAudioDirector'
import { relationshipMilestones } from '../content/relationship.config'
import { useExperienceStore } from '../store/useExperienceStore'

const codeLines = [
  '#include <iostream>',
  '#include <string>',
  '',
  'int main() {',
  '  std::string respuesta;',
  '  std::cout << "Open the observatory?";',
  '  std::cin >> respuesta;',
  '  if (respuesta == "si") abrir_constelacion();',
  '  return 0;',
  '}',
]

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')

export function RitualConsole() {
  const [typedCode, setTypedCode] = useState('')
  const [answer, setAnswer] = useState('')
  const [denied, setDenied] = useState(false)
  const [notified, setNotified] = useState(false)
  const [buttonOffset, setButtonOffset] = useState({ x: 0, y: 0 })
  const inputRef = useRef<HTMLInputElement | null>(null)
  const setStage = useExperienceStore((state) => state.setStage)
  const { unlock, playCue } = useAudioDirector()
  const fullCode = useMemo(() => codeLines.join('\n'), [])

  useEffect(() => {
    if (typedCode.length >= fullCode.length) {
      inputRef.current?.focus()
      return
    }

    const timeout = window.setTimeout(
      () => {
        setTypedCode(fullCode.slice(0, typedCode.length + 1))
        if (typedCode.length % 9 === 0) playCue('keypress')
      },
      typedCode.length < 42 ? 34 : 10,
    )

    return () => window.clearTimeout(timeout)
  }, [fullCode, playCue, typedCode])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    unlock()
    const value = normalize(answer)

    if (value === 'si' || value === 's') {
      playCue('accept')
      setStage('intro')
      return
    }

    if (value === 'no') {
      playCue('deny')
      setDenied(true)
      setNotified(false)
      return
    }
  }

  const moveNo = () => {
    setButtonOffset({
      x: Math.round((Math.random() - 0.5) * 260),
      y: Math.round((Math.random() - 0.5) * 150),
    })
  }

  const notifyArchive = () => {
    setNotified(true)
    playCue('slow-blink')
  }

  return (
    <section
      className={`ritual-screen ${notified ? 'is-melancholy' : ''}`}
      aria-label="Demo archive entrance"
    >
      <div className="ritual-vignette" />
      <div className="ritual-stars" />
      <motion.div
        className="ritual-console"
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <header className="ritual-console__header">
          <span>demo archive</span>
          <span>observatory.cpp</span>
        </header>
        <div className="ritual-console__code">
          <pre>
            {typedCode}
            {typedCode.length < fullCode.length && <span className="ritual-caret">_</span>}
          </pre>
          {typedCode.length >= fullCode.length && (
            <form className="ritual-code-prompt" onSubmit={submit}>
              <label htmlFor="answer">cin &gt;&gt;</label>
              <input
                ref={inputRef}
                id="answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="si"
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit">enter</button>
            </form>
          )}
        </div>
      </motion.div>

      <aside className="ritual-context ritual-context--quiet">
        <p>03 / 06 / 2021</p>
        <span>public demo / type the response in the console</span>
      </aside>

      {denied && (
        <motion.div
          className={`denial-field ${notified ? 'is-notified' : ''}`}
          initial={{ opacity: 0, filter: 'blur(12px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
        >
          {notified && (
            <>
              <motion.div
                className="denial-lid denial-lid--top"
                initial={{ y: '-100%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 1.25, ease: [0.76, 0, 0.24, 1] }}
              />
              <motion.div
                className="denial-lid denial-lid--bottom"
                initial={{ y: '100%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 1.25, ease: [0.76, 0, 0.24, 1] }}
              />
            </>
          )}
          <motion.button
            type="button"
            className="escaping-no"
            animate={{ x: buttonOffset.x, y: buttonOffset.y }}
            transition={{ type: 'spring', stiffness: 160, damping: 17 }}
            onMouseEnter={moveNo}
            onFocus={moveNo}
            onClick={notifyArchive}
          >
            no?
          </motion.button>
          {notified && (
            <motion.div
              className="melancholy-note"
              initial={{ opacity: 0, y: 28, filter: 'blur(16px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.82, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <p data-smoke="Access request archived...">Access request archived...</p>
              <small>the atlas kept the attempt; you can type again.</small>
            </motion.div>
          )}
        </motion.div>
      )}

      <div className="ritual-dates" aria-hidden>
        {relationshipMilestones.map((milestone) => (
          <span key={milestone.id}>{milestone.title}</span>
        ))}
      </div>
    </section>
  )
}
