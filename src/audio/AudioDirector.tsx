import { Howl, Howler } from 'howler'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { AudioCue } from '../types/story'
import { useExperienceStore } from '../store/useExperienceStore'
import { AudioDirectorContext } from './audioContext'

const cueMap: Record<AudioCue, { src: string[]; volume: number; loop?: boolean; optional?: boolean }> = {
  boot: { src: ['/media/audio/paper-open.wav', '/media/audio/paper-open.mp3'], volume: 0.28 },
  keypress: { src: ['/media/audio/soft-key.wav', '/media/audio/soft-key.mp3'], volume: 0.16 },
  deny: { src: ['/media/audio/constellation-fall.wav', '/media/audio/constellation-fall.mp3'], volume: 0.3 },
  accept: { src: ['/media/audio/paper-open.wav', '/media/audio/paper-open.mp3'], volume: 0.32 },
  glitch: {
    src: ['/media/audio/constellation-fall.wav', '/media/audio/constellation-fall.mp3'],
    volume: 0.25,
  },
  reveal: { src: ['/media/audio/piano-theme.wav', '/media/audio/piano-theme.mp3'], volume: 0.34, loop: true },
  'soft-click': { src: ['/media/audio/soft-key.wav', '/media/audio/soft-key.mp3'], volume: 0.14 },
  memory: { src: ['/media/audio/paper-open.wav', '/media/audio/paper-open.mp3'], volume: 0.2 },
  'photo-cut': { src: ['/media/audio/photo-cut.wav', '/media/audio/photo-cut.mp3'], volume: 0.22 },
  'slow-blink': { src: ['/media/audio/slow-blink.wav', '/media/audio/slow-blink.mp3'], volume: 0.3 },
  piano: { src: ['/media/audio/piano-theme.wav', '/media/audio/piano-theme.mp3'], volume: 0.36, loop: true },
  'star-born': {
    src: ['/media/audio/star-born.wav', '/media/audio/star-born.mp3'],
    volume: 0.26,
    optional: true,
  },
  'thread-draw': {
    src: ['/media/audio/thread-draw.wav', '/media/audio/thread-draw.mp3'],
    volume: 0.18,
    optional: true,
  },
  'memory-open': {
    src: ['/media/audio/memory-open.wav', '/media/audio/memory-open.mp3'],
    volume: 0.2,
    optional: true,
  },
  'crystal-break': {
    src: ['/media/audio/crystal-break.wav', '/media/audio/crystal-break.mp3'],
    volume: 0.24,
    optional: true,
  },
}

const mainPlaylist = [
  { src: '/media/audio/music/demo-track-01.wav', volume: 0.32 },
  { src: '/media/audio/music/demo-track-02.wav', volume: 0.3 },
  { src: '/media/audio/music/demo-track-03.wav', volume: 0.31 },
]

const playlistBridge = { src: '/media/audio/music-bridge.wav', volume: 0.11 }
const playlistIntroFadeMs = 9000
const playlistCrossfadeMs = 7800
const playlistBridgeLeadMs = 2100

function hasUserActivatedAudio() {
  return typeof navigator === 'undefined' || navigator.userActivation?.hasBeenActive !== false
}

const playlistRuntime: {
  sounds: Howl[]
  bridge: Howl | null
  started: boolean
  timer: number | null
  bridgeTimer: number | null
  active: { sound: Howl; id: number; index: number } | null
} = {
  sounds: [],
  bridge: null,
  started: false,
  timer: null,
  bridgeTimer: null,
  active: null,
}

export function AudioDirectorProvider({ children }: { children: React.ReactNode }) {
  const soundsRef = useRef<Partial<Record<AudioCue, Howl>>>({})
  const audioContextRef = useRef<AudioContext | null>(null)
  const failedCueRef = useRef<Partial<Record<AudioCue, boolean>>>({})
  const audioEnabled = useExperienceStore((state) => state.audioEnabled)

  useEffect(() => {
    Howler.volume(audioEnabled ? 0.82 : 0)
  }, [audioEnabled])

  const unlock = useCallback(() => {
    if (!hasUserActivatedAudio()) return
    Howler.volume(audioEnabled ? 0.82 : 0)
    if (!audioContextRef.current) audioContextRef.current = new AudioContext()
    void audioContextRef.current.resume()
  }, [audioEnabled])

  const clearPlaylistTimers = useCallback(() => {
    if (playlistRuntime.timer) window.clearTimeout(playlistRuntime.timer)
    if (playlistRuntime.bridgeTimer) window.clearTimeout(playlistRuntime.bridgeTimer)
    playlistRuntime.timer = null
    playlistRuntime.bridgeTimer = null
  }, [])

  const playFallbackCue = useCallback(
    (cue: AudioCue) => {
      if (!audioEnabled) return
      const audioContext = audioContextRef.current
      if (!audioContext) return

      const now = audioContext.currentTime
      if (cue === 'photo-cut' || cue === 'slow-blink' || cue === 'deny') {
        const duration = cue === 'photo-cut' ? 0.32 : cue === 'slow-blink' ? 1.25 : 1.6
        const buffer = audioContext.createBuffer(
          1,
          Math.floor(audioContext.sampleRate * duration),
          audioContext.sampleRate,
        )
        const data = buffer.getChannelData(0)
        for (let index = 0; index < data.length; index += 1) {
          const progress = index / data.length
          const photoSnap =
            Math.exp(-Math.max(0, progress - 0.08) * 42) + Math.exp(-Math.max(0, progress - 0.26) * 34) * 0.46
          const envelope = cue === 'photo-cut' ? photoSnap : Math.pow(1 - progress, 1.8)
          data[index] = (Math.random() * 2 - 1) * envelope
        }

        const source = audioContext.createBufferSource()
        const filter = audioContext.createBiquadFilter()
        const gain = audioContext.createGain()
        const lowPad = audioContext.createOscillator()
        const lowPadGain = audioContext.createGain()

        source.buffer = buffer
        filter.type = cue === 'photo-cut' ? 'highpass' : 'lowpass'
        filter.Q.setValueAtTime(cue === 'photo-cut' ? 0.72 : 0.6, now)
        filter.frequency.setValueAtTime(cue === 'photo-cut' ? 1180 : 620, now)
        filter.frequency.exponentialRampToValueAtTime(cue === 'photo-cut' ? 820 : 90, now + duration)
        gain.gain.setValueAtTime(0.0001, now)
        gain.gain.exponentialRampToValueAtTime(cue === 'photo-cut' ? 0.024 : 0.052, now + 0.03)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

        source.connect(filter)
        filter.connect(gain)
        gain.connect(audioContext.destination)

        lowPad.type = 'sine'
        lowPad.frequency.setValueAtTime(cue === 'photo-cut' ? 146 : 58, now)
        lowPad.frequency.exponentialRampToValueAtTime(cue === 'photo-cut' ? 128 : 36, now + duration)
        lowPadGain.gain.setValueAtTime(0.0001, now)
        lowPadGain.gain.exponentialRampToValueAtTime(cue === 'photo-cut' ? 0.008 : 0.03, now + 0.04)
        lowPadGain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
        lowPad.connect(lowPadGain)
        lowPadGain.connect(audioContext.destination)

        source.start(now)
        source.stop(now + duration)
        lowPad.start(now)
        lowPad.stop(now + duration)
        return
      }

      const notes: Partial<Record<AudioCue, number[]>> = {
        keypress: [988],
        accept: [392, 587, 784],
        reveal: [196, 294, 392],
        piano: [196, 294, 392],
        memory: [330, 440],
        boot: [247, 330],
        glitch: [220],
        'soft-click': [880],
      }
      const frequencies = notes[cue] ?? [330]
      const duration = cue === 'piano' || cue === 'reveal' ? 1.8 : 0.42
      const master = audioContext.createGain()
      const filter = audioContext.createBiquadFilter()

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(980, now)
      master.gain.setValueAtTime(0.0001, now)
      master.gain.exponentialRampToValueAtTime(cue === 'keypress' ? 0.018 : 0.055, now + 0.04)
      master.gain.exponentialRampToValueAtTime(0.0001, now + duration)
      filter.connect(master)
      master.connect(audioContext.destination)

      frequencies.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator()
        const gain = audioContext.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(frequency, now)
        oscillator.detune.setValueAtTime(index * 4, now)
        gain.gain.setValueAtTime(0.0001, now)
        gain.gain.exponentialRampToValueAtTime(0.34 / (frequencies.length + 1), now + 0.05 + index * 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
        oscillator.connect(gain)
        gain.connect(filter)
        oscillator.start(now + index * 0.018)
        oscillator.stop(now + duration + 0.05)
      })
    },
    [audioEnabled],
  )

  const startPlaylist = useCallback(() => {
    if (!audioEnabled || playlistRuntime.started || !hasUserActivatedAudio()) return
    playlistRuntime.started = true
    unlock()

    if (!playlistRuntime.sounds.length) {
      playlistRuntime.sounds = mainPlaylist.map(
        (track) =>
          new Howl({
            src: [track.src],
            volume: 0,
            html5: false,
            preload: true,
          }),
      )
    }

    if (!playlistRuntime.bridge) {
      playlistRuntime.bridge = new Howl({
        src: [playlistBridge.src],
        volume: playlistBridge.volume,
        html5: false,
        preload: true,
      })
    }

    const playTrack = (index: number, fadeInMs: number) => {
      clearPlaylistTimers()

      const sounds = playlistRuntime.sounds
      const trackIndex = index % sounds.length
      const sound = sounds[trackIndex]
      const previous = playlistRuntime.active
      const id = sound.play()

      sound.volume(0, id)
      playlistRuntime.active = { sound, id, index: trackIndex }
      sound.fade(0, mainPlaylist[trackIndex].volume, fadeInMs, id)

      if (previous && (previous.sound !== sound || previous.id !== id)) {
        previous.sound.fade(mainPlaylist[previous.index].volume, 0, playlistCrossfadeMs, previous.id)
        window.setTimeout(() => previous.sound.stop(previous.id), playlistCrossfadeMs + 420)
      }

      const scheduleTransition = () => {
        const active = playlistRuntime.active
        if (active?.sound !== sound || active.id !== id) return

        const duration = sound.duration()
        const nextDelayMs =
          Number.isFinite(duration) && duration > 18
            ? Math.max(6000, duration * 1000 - playlistCrossfadeMs)
            : 180000

        playlistRuntime.bridgeTimer = window.setTimeout(
          () => {
            const latest = playlistRuntime.active
            if (latest?.sound !== sound || latest.id !== id) return

            const bridge = playlistRuntime.bridge
            if (!bridge || !audioEnabled) return
            const bridgeId = bridge.play()
            bridge.volume(0, bridgeId)
            bridge.fade(0, playlistBridge.volume, 900, bridgeId)
            window.setTimeout(() => {
              if (bridge.playing(bridgeId)) bridge.fade(playlistBridge.volume, 0, 1800, bridgeId)
            }, 1500)
          },
          Math.max(900, nextDelayMs - playlistBridgeLeadMs),
        )

        playlistRuntime.timer = window.setTimeout(() => {
          const latest = playlistRuntime.active
          if (latest?.sound !== sound || latest.id !== id) return
          playTrack(trackIndex + 1, playlistCrossfadeMs)
        }, nextDelayMs)
      }

      if (sound.state() === 'loaded') scheduleTransition()
      else sound.once('load', scheduleTransition)

      sound.once('end', () => {
        const active = playlistRuntime.active
        if (active?.sound === sound && active.id === id) {
          playTrack(trackIndex + 1, playlistCrossfadeMs)
        }
      })
    }

    playTrack(playlistRuntime.active?.index ?? 0, playlistIntroFadeMs)
  }, [audioEnabled, clearPlaylistTimers, unlock])

  const stopPlaylist = useCallback(() => {
    clearPlaylistTimers()
    playlistRuntime.started = false
    const active = playlistRuntime.active
    if (active) {
      active.sound.fade(mainPlaylist[active.index].volume, 0, 1200, active.id)
      window.setTimeout(() => active.sound.stop(active.id), 1300)
    }
    playlistRuntime.bridge?.stop()
    playlistRuntime.active = null
  }, [clearPlaylistTimers])

  const playCue = useCallback(
    (cue: AudioCue) => {
      if (!audioEnabled || !hasUserActivatedAudio()) return
      unlock()

      const settings = cueMap[cue]
      const existing = soundsRef.current[cue]
      const sound =
        existing ??
        new Howl({
          src: settings.src,
          volume: 0,
          loop: settings.loop ?? false,
          html5: settings.loop ?? false,
          onloaderror: () => {
            failedCueRef.current[cue] = true
            if (!settings.optional) playFallbackCue(cue)
          },
          onplayerror: () => {
            failedCueRef.current[cue] = true
            if (!settings.optional) playFallbackCue(cue)
          },
        })

      soundsRef.current[cue] = sound

      if (failedCueRef.current[cue]) {
        if (settings.optional) return
        playFallbackCue(cue)
        return
      }

      if (settings.loop && sound.playing()) return

      const id = sound.play()
      sound.fade(0, settings.volume, 900, id)
      if (!settings.loop) {
        window.setTimeout(() => {
          if (sound.playing(id)) sound.fade(settings.volume, 0, 500, id)
        }, 650)
      }
    },
    [audioEnabled, playFallbackCue, unlock],
  )

  const value = useMemo(
    () => ({ unlock, playCue, startPlaylist, stopPlaylist }),
    [playCue, startPlaylist, stopPlaylist, unlock],
  )

  return <AudioDirectorContext.Provider value={value}>{children}</AudioDirectorContext.Provider>
}
