import { useEffect, useLayoutEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import gsap from 'gsap'
import { useAudioDirector } from '../audio/useAudioDirector'
import { introPlaceholders } from '../content/placeholders'
import { defaultMemories } from '../content/relationship.config'
import { useExperienceStore } from '../store/useExperienceStore'

export function OpeningPrelude() {
  const rootRef = useRef<HTMLElement | null>(null)
  const setStage = useExperienceStore((state) => state.setStage)
  const { playCue } = useAudioDirector()

  useEffect(() => {
    const preloaded = defaultMemories
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
  }, [])

  useLayoutEffect(() => {
    let finishTimer: number | null = null
    const finishPrelude = () => {
      if (finishTimer) window.clearTimeout(finishTimer)
      finishTimer = null
      setStage('experience')
    }

    finishTimer = window.setTimeout(finishPrelude, 9600)

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { ease: 'power3.inOut' },
        onComplete: finishPrelude,
      })

      timeline
        .fromTo(
          '.film-shot',
          {
            opacity: 0,
            scale: 1.04,
            filter: 'blur(10px) saturate(0.82)',
          },
          {
            opacity: 0.78,
            scale: 1,
            filter: 'blur(0px) brightness(0.76) saturate(0.82) contrast(1.08)',
            duration: 0.72,
            stagger: 0.42,
          },
          0.42,
        )
        .to(
          '.film-shot',
          {
            opacity: 0,
            scale: 1.07,
            filter: 'blur(7px) brightness(0.5) saturate(0.68)',
            duration: 0.56,
            stagger: 0.42,
          },
          0.86,
        )
        .fromTo(
          '.prelude-cache',
          { opacity: 0, filter: 'blur(12px)' },
          { opacity: 1, filter: 'blur(0px)', duration: 0.62 },
          5.45,
        )
        .fromTo(
          '.prelude-cache__bar span',
          { scaleX: 0 },
          { scaleX: 1, duration: 1.85, ease: 'power2.out' },
          5.58,
        )
        .to('.prelude-cache', { opacity: 0, filter: 'blur(10px)', duration: 0.42 }, 7.32)
        .fromTo(
          '.blink-lid--top',
          { yPercent: -100 },
          { yPercent: 0, duration: 1.05, ease: 'expo.inOut', onStart: () => playCue('slow-blink') },
          7.65,
        )
        .fromTo(
          '.blink-lid--bottom',
          { yPercent: 100 },
          { yPercent: 0, duration: 1.05, ease: 'expo.inOut' },
          7.65,
        )
        .to(rootRef.current, { opacity: 0, duration: 0.72 }, 8.72)
    }, rootRef)

    return () => {
      if (finishTimer) window.clearTimeout(finishTimer)
      ctx.revert()
    }
  }, [playCue, setStage])

  return (
    <section
      className="prelude-screen prelude-screen--montage"
      ref={rootRef}
      aria-label="Intro cinematografica"
    >
      <div className="film-grain-soft" />

      <div className="film-strip">
        {introPlaceholders.map((frame, index) => (
          <figure
            className="film-shot"
            key={frame.id}
            style={
              {
                '--shot-x': `${((index % 3) - 1) * 4}vw`,
                '--shot-y': `${((index % 4) - 1.5) * 3}vh`,
                '--shot-rotate': `${((index % 5) - 2) * 0.55}deg`,
                '--shot-image': `url(${frame.src})`,
              } as CSSProperties
            }
          >
            <img
              src={frame.src}
              alt={frame.alt}
              onError={(event) => {
                event.currentTarget.src = '/media/placeholders/placeholder-memory.svg'
              }}
            />
          </figure>
        ))}
      </div>

      <div className="blink-lid blink-lid--top" />
      <div className="blink-lid blink-lid--bottom" />
      <div className="prelude-cache" aria-hidden="true">
        <span>preparando constelación</span>
        <i className="prelude-cache__bar">
          <span />
        </i>
      </div>
    </section>
  )
}
