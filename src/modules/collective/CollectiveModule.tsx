import { useEffect, useMemo, useRef, useState } from 'react'
import {
  COLLECTIVE_LEVELS,
  LEVELS,
  TCF_CANADA_LEGACY_LEVELS,
  TCF_CANADA_LEVELS,
  TCF_IRN_LEGACY_LEVELS,
  TCF_IRN_LEVELS,
  TCF_QC_LEGACY_LEVELS,
  TCF_QC_LEVELS,
  TCF_TP_LEGACY_LEVELS,
  TCF_TP_LEVELS,
  type CollectiveLevel,
  type ExamConfig,
  type Level,
  type TcfLevel,
} from '../../domain/types'
import { DEFAULT_CONFIG } from '../../domain/defaultConfig'
import { formatCountdown, toHHMM } from '../../lib/time'
import {
  clearCollectiveTimerSession,
  type CollectiveTimerSession,
  loadCollectiveTimerSession,
  saveCollectiveTimerSession,
} from '../../lib/storage'

const SYNC_CODE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const SYNC_CODE_LENGTH = 8
const SYNC_CODE_LEVEL_BITS = 5n
const SYNC_CODE_TIME_BITS = 26n
const SYNC_CODE_TIME_MODULO = 1 << 26
const SYNC_CODE_MAX_TIME_VALUE_MS = SYNC_CODE_TIME_MODULO - 1

export type ExamTrack = 'delf' | 'dalf' | 'tcf-tp' | 'tcf-canada' | 'tcf-quebec' | 'tcf-irn'

const COLLECTIVE_LEVEL_LABELS: Partial<Record<CollectiveLevel, string>> = {
  TP_CO: 'Compréhension orale',
  TP_MSL: 'Maîtrise des structures de la langue',
  TP_CE: 'Compréhension écrite',
  TP_EE: 'Expression écrite',
  CA_CO: 'Compréhension orale',
  CA_CE: 'Compréhension écrite',
  CA_EE: 'Expression écrite',
  QC_CO: 'Compréhension orale',
  QC_CE: 'Compréhension écrite',
  QC_EE: 'Expression écrite',
  IRN_CO: 'Compréhension orale',
  IRN_CE: 'Compréhension écrite',
  IRN_EE: 'Expression écrite',
}

function getCollectiveLevelLabel(level: CollectiveLevel): string {
  return COLLECTIVE_LEVEL_LABELS[level] ?? level
}

const EXAM_TRACK_OPTIONS: Array<{ value: ExamTrack; label: string }> = [
  { value: 'delf', label: 'DELF' },
  { value: 'dalf', label: 'DALF' },
  { value: 'tcf-tp', label: 'TCF TP' },
  { value: 'tcf-canada', label: 'TCF Canada' },
  { value: 'tcf-quebec', label: 'TCF Québec' },
  { value: 'tcf-irn', label: 'TCF Intégration, Résidence, Nationalité' },
]

function getExamTrackFromLevel(level: CollectiveLevel): ExamTrack {
  if (level === 'A1' || level === 'A2' || level === 'B1' || level === 'B2') return 'delf'
  if (level === 'C1' || level === 'C2') return 'dalf'
  if (
    TCF_TP_LEVELS.includes(level as (typeof TCF_TP_LEVELS)[number]) ||
    TCF_TP_LEGACY_LEVELS.includes(level as (typeof TCF_TP_LEGACY_LEVELS)[number])
  ) {
    return 'tcf-tp'
  }
  if (
    TCF_CANADA_LEVELS.includes(level as (typeof TCF_CANADA_LEVELS)[number]) ||
    TCF_CANADA_LEGACY_LEVELS.includes(level as (typeof TCF_CANADA_LEGACY_LEVELS)[number])
  ) {
    return 'tcf-canada'
  }
  if (
    TCF_QC_LEVELS.includes(level as (typeof TCF_QC_LEVELS)[number]) ||
    TCF_QC_LEGACY_LEVELS.includes(level as (typeof TCF_QC_LEGACY_LEVELS)[number])
  ) {
    return 'tcf-quebec'
  }
  if (
    TCF_IRN_LEVELS.includes(level as (typeof TCF_IRN_LEVELS)[number]) ||
    TCF_IRN_LEGACY_LEVELS.includes(level as (typeof TCF_IRN_LEGACY_LEVELS)[number])
  ) {
    return 'tcf-irn'
  }
  return 'tcf-irn'
}

function getLevelsForTrack(track: ExamTrack): readonly CollectiveLevel[] {
  switch (track) {
    case 'delf':
      return ['A1', 'A2', 'B1', 'B2']
    case 'dalf':
      return ['C1', 'C2']
    case 'tcf-tp':
      return TCF_TP_LEVELS
    case 'tcf-canada':
      return TCF_CANADA_LEVELS
    case 'tcf-quebec':
      return TCF_QC_LEVELS
    case 'tcf-irn':
      return TCF_IRN_LEVELS
    default:
      return LEVELS
  }
}

const TCF_COLLECTIVE_CONFIG: Record<TcfLevel, Pick<ExamConfig[Level], 'collectiveTotalMinutes' | 'collectiveThirdTimeExtraMinutes'>> = {
  TP_CO: { collectiveTotalMinutes: 25, collectiveThirdTimeExtraMinutes: 0 },
  TP_MSL: { collectiveTotalMinutes: 15, collectiveThirdTimeExtraMinutes: 0 },
  TP_CE: { collectiveTotalMinutes: 45, collectiveThirdTimeExtraMinutes: 0 },
  TP_EE: { collectiveTotalMinutes: 60, collectiveThirdTimeExtraMinutes: 0 },
  CA_CO: { collectiveTotalMinutes: 35, collectiveThirdTimeExtraMinutes: 12 },
  CA_CE: { collectiveTotalMinutes: 60, collectiveThirdTimeExtraMinutes: 20 },
  CA_EE: { collectiveTotalMinutes: 60, collectiveThirdTimeExtraMinutes: 20 },
  QC_CO: { collectiveTotalMinutes: 25, collectiveThirdTimeExtraMinutes: 0 },
  QC_CE: { collectiveTotalMinutes: 45, collectiveThirdTimeExtraMinutes: 0 },
  QC_EE: { collectiveTotalMinutes: 60, collectiveThirdTimeExtraMinutes: 0 },
  TP: { collectiveTotalMinutes: 100, collectiveThirdTimeExtraMinutes: 33 },
  "Compréhension de l'oral": { collectiveTotalMinutes: 35, collectiveThirdTimeExtraMinutes: 12 },
  'Compréhension écrite': { collectiveTotalMinutes: 60, collectiveThirdTimeExtraMinutes: 20 },
  'Production écrite': { collectiveTotalMinutes: 60, collectiveThirdTimeExtraMinutes: 20 },
  'Compréhension des écrits': { collectiveTotalMinutes: 60, collectiveThirdTimeExtraMinutes: 20 },
  'Épreuve Écrite': { collectiveTotalMinutes: 60, collectiveThirdTimeExtraMinutes: 20 },
  Canada: { collectiveTotalMinutes: 60, collectiveThirdTimeExtraMinutes: 20 },
  Quebec: { collectiveTotalMinutes: 100, collectiveThirdTimeExtraMinutes: 33 },
  IRN_CO: { collectiveTotalMinutes: 20, collectiveThirdTimeExtraMinutes: 0 },
  IRN_CE: { collectiveTotalMinutes: 35, collectiveThirdTimeExtraMinutes: 0 },
  IRN_EE: { collectiveTotalMinutes: 30, collectiveThirdTimeExtraMinutes: 0 },
  IRN: { collectiveTotalMinutes: 100, collectiveThirdTimeExtraMinutes: 33 },
}

const SYNC_CODE_MAX_ACTIVE_DURATION_MS = Math.max(
  ...LEVELS.map((level) => (DEFAULT_CONFIG[level].collectiveTotalMinutes + DEFAULT_CONFIG[level].collectiveThirdTimeExtraMinutes) * 60 * 1000),
  ...Object.values(TCF_COLLECTIVE_CONFIG).map((entry) => (entry.collectiveTotalMinutes + entry.collectiveThirdTimeExtraMinutes) * 60 * 1000),
)

const TIMER_COLOR_GREEN_DARK = '#14532d'
const TIMER_COLOR_ORANGE_DARK = '#9a3412'
const TIMER_COLOR_RED_DARK = '#7f1d1d'
const TIMER_COLOR_ZERO = '#DA002E'
const TIMER_ORANGE_AT_PROGRESS = 0.8
const TIMER_FINAL_RED_SECONDS = 10

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  const value = Number.parseInt(normalized, 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

function mixHexColor(fromHex: string, toHex: string, factor: number): string {
  const from = hexToRgb(fromHex)
  const to = hexToRgb(toHex)
  const t = Math.max(0, Math.min(1, factor))
  const r = Math.round(from.r + (to.r - from.r) * t)
  const g = Math.round(from.g + (to.g - from.g) * t)
  const b = Math.round(from.b + (to.b - from.b) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function getTimerColor(progress: number, remainingSeconds: number): string {
  if (remainingSeconds <= TIMER_FINAL_RED_SECONDS) {
    const redBlend = 1 - remainingSeconds / TIMER_FINAL_RED_SECONDS
    return mixHexColor(TIMER_COLOR_ORANGE_DARK, TIMER_COLOR_RED_DARK, redBlend)
  }

  const orangeBlend = Math.max(0, Math.min(TIMER_ORANGE_AT_PROGRESS, progress)) / TIMER_ORANGE_AT_PROGRESS
  return mixHexColor(TIMER_COLOR_GREEN_DARK, TIMER_COLOR_ORANGE_DARK, orangeBlend)
}

function isDelfDalfLevel(value: CollectiveLevel): value is Level {
  return LEVELS.includes(value as Level)
}

function getCollectiveLevelConfig(level: CollectiveLevel) {
  if (isDelfDalfLevel(level)) return DEFAULT_CONFIG[level]
  return TCF_COLLECTIVE_CONFIG[level]
}

interface DecodedSyncCode {
  level: CollectiveLevel
  useThirdTime: boolean
  running: boolean
  timeValueMs: number
}

function encodeBase62(value: bigint, length: number): string {
  let working = value
  let output = ''
  const base = BigInt(SYNC_CODE_ALPHABET.length)

  for (let index = 0; index < length; index += 1) {
    const digit = Number(working % base)
    output = `${SYNC_CODE_ALPHABET[digit]}${output}`
    working /= base
  }

  return output
}

function decodeBase62(code: string): bigint | null {
  let value = 0n
  const base = BigInt(SYNC_CODE_ALPHABET.length)

  for (const char of code) {
    const digit = SYNC_CODE_ALPHABET.indexOf(char)
    if (digit < 0) return null
    value = value * base + BigInt(digit)
  }

  return value
}

function encodeSyncCode(payload: DecodedSyncCode): string {
  const levelIndex = COLLECTIVE_LEVELS.indexOf(payload.level)
  if (levelIndex < 0) {
    throw new Error('Niveau invalide pour le code de synchro.')
  }

  let packed = BigInt(levelIndex)
  packed = (packed << 1n) | BigInt(payload.useThirdTime ? 1 : 0)
  packed = (packed << 1n) | BigInt(payload.running ? 1 : 0)
  packed = (packed << SYNC_CODE_TIME_BITS) | BigInt(Math.max(0, Math.min(SYNC_CODE_MAX_TIME_VALUE_MS, payload.timeValueMs)))

  return encodeBase62(packed, SYNC_CODE_LENGTH)
}

function decodeSyncCode(code: string): DecodedSyncCode | null {
  const normalized = code.trim()
  if (normalized.length !== SYNC_CODE_LENGTH) return null

  const packed = decodeBase62(normalized)
  if (packed === null) return null

  let working = packed
  const timeValueMs = Number(working & ((1n << SYNC_CODE_TIME_BITS) - 1n))
  working >>= SYNC_CODE_TIME_BITS
  const running = Boolean(Number(working & 1n))
  working >>= 1n
  const useThirdTime = Boolean(Number(working & 1n))
  working >>= 1n
  const levelIndex = Number(working & ((1n << SYNC_CODE_LEVEL_BITS) - 1n))

  const level = COLLECTIVE_LEVELS[levelIndex]
  if (!level) return null

  return {
    level,
    useThirdTime,
    running,
    timeValueMs,
  }
}

function generateSessionCode(length = 7): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(length)
  window.crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('')
}

interface CollectiveModuleProps {
  config: ExamConfig
  showSeconds: boolean
  onShowSecondsChange: (value: boolean) => void
  onExamTrackChange: (value: ExamTrack) => void
  onOpenSettings: () => void
  schoolLogo: string | null
  examLogoSrc: string
  examLogoAlt: string
}

export function CollectiveModule({
  config,
  showSeconds,
  onShowSecondsChange,
  onExamTrackChange,
  onOpenSettings,
  schoolLogo,
  examLogoSrc,
  examLogoAlt,
}: CollectiveModuleProps) {
  const fullscreenRootRef = useRef<HTMLElement | null>(null)
  const initialSession = loadCollectiveTimerSession()
  const initialRemainingMs = initialSession
    ? initialSession.running
      ? Math.max(0, initialSession.endAt - Date.now())
      : Math.max(0, initialSession.remainingMs ?? initialSession.remainingSeconds * 1000)
    : config.A1.collectiveTotalMinutes * 60 * 1000
  const [viewLevel, setViewLevel] = useState<CollectiveLevel>(initialSession?.level ?? 'A1')
  const [examTrack, setExamTrack] = useState<ExamTrack>(
    initialSession ? getExamTrackFromLevel(initialSession.level) : 'delf',
  )
  const [activeSession, setActiveSession] = useState<CollectiveTimerSession | null>(initialSession)
  const [selectedUseThirdTime, setSelectedUseThirdTime] = useState<boolean>(initialSession?.useThirdTime ?? false)
  const [resetArmed, setResetArmed] = useState<boolean>(false)
  const [transferStatus, setTransferStatus] = useState<string | null>(null)
  const [syncCodeInput, setSyncCodeInput] = useState<string>('')
  const [remainingMs, setRemainingMs] = useState<number>(initialRemainingMs)
  const [running, setRunning] = useState<boolean>(initialSession?.running ?? false)
  const [endAt, setEndAt] = useState<number | null>(initialSession?.endAt ?? null)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  const activeLevel = activeSession?.level ?? null
  const isDelfDalfTrack = examTrack === 'delf' || examTrack === 'dalf'
  const activeUseThirdTime = isDelfDalfTrack ? selectedUseThirdTime : false
  const displayLevel = activeSession?.level ?? viewLevel
  const visibleLevels = getLevelsForTrack(examTrack)
  const displayConfig = getCollectiveLevelConfig(displayLevel)
  const baseMinutes = displayConfig.collectiveTotalMinutes
  const thirdTimeExtra = displayConfig.collectiveThirdTimeExtraMinutes
  const activeMinutes = baseMinutes + (activeUseThirdTime ? thirdTimeExtra : 0)
  const baseMs = activeMinutes * 60 * 1000
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000))

  useEffect(() => {
    onExamTrackChange(examTrack)
  }, [examTrack, onExamTrackChange])

  useEffect(() => {
    const updateFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === fullscreenRootRef.current)
    }

    document.addEventListener('fullscreenchange', updateFullscreenState)
    updateFullscreenState()

    return () => {
      document.removeEventListener('fullscreenchange', updateFullscreenState)
    }
  }, [])

  useEffect(() => {
    if (!running || endAt === null) return

    const timer = window.setInterval(() => {
      const nextRemainingMs = Math.max(0, endAt - Date.now())
      setRemainingMs(nextRemainingMs)

      if (nextRemainingMs === 0) {
        setRunning(false)
        setEndAt(null)
        setActiveSession((current) =>
          current
            ? {
                ...current,
                running: false,
                endAt: Date.now(),
                remainingSeconds: 0,
                remainingMs: 0,
                updatedAt: Date.now(),
              }
            : current,
        )
        setTransferStatus('Chrono terminé.')
      }
    }, 10)

    return () => window.clearInterval(timer)
  }, [running, endAt])

  useEffect(() => {
    if (!activeSession) {
      setRemainingMs(baseMs)
      return
    }

    setRemainingMs(activeSession.running ? Math.max(0, activeSession.endAt - Date.now()) : activeSession.remainingMs ?? activeSession.remainingSeconds * 1000)
    setRunning(activeSession.running)
    setEndAt(activeSession.endAt)
  }, [baseMs, activeSession])

  useEffect(() => {
    if (isDelfDalfTrack) return
    if (selectedUseThirdTime) {
      setSelectedUseThirdTime(false)
    }

    setActiveSession((current) =>
      current && current.useThirdTime
        ? {
            ...current,
            useThirdTime: false,
            updatedAt: Date.now(),
          }
        : current,
    )
  }, [isDelfDalfTrack, selectedUseThirdTime])

  useEffect(() => {
    if (visibleLevels.includes(viewLevel)) return
    setViewLevel(visibleLevels[0])
  }, [visibleLevels, viewLevel])

  useEffect(() => {
    if (!activeSession) return

    const currentRemainingMs = running && endAt !== null ? Math.max(0, endAt - Date.now()) : Math.max(0, remainingMs)

    saveCollectiveTimerSession({
      token: activeSession.token,
      level: activeSession.level,
      useThirdTime: activeSession.useThirdTime,
      running,
      endAt: endAt ?? Date.now() + currentRemainingMs,
      remainingSeconds: Math.ceil(currentRemainingMs / 1000),
      remainingMs: currentRemainingMs,
      updatedAt: Date.now(),
    })
  }, [activeSession, running, endAt, remainingMs])

  const progress = useMemo(() => {
    if (baseMs === 0) return 0
    return Math.min(1, Math.max(0, 1 - remainingMs / baseMs))
  }, [remainingMs, baseMs])
  const isTimeUp = remainingMs === 0 && activeSession !== null
  const progressPercent = Math.round(progress * 100)
  const progressCircleRadius = 46
  const progressCircleCircumference = 2 * Math.PI * progressCircleRadius
  const progressCircleOffset = progressCircleCircumference * (1 - progress)
  const timerColor = useMemo(
    () => (isTimeUp ? TIMER_COLOR_ZERO : getTimerColor(progress, remainingSeconds)),
    [isTimeUp, progress, remainingSeconds],
  )

  const adjustMinutes = (delta: number) => {
    setResetArmed(false)
    setTransferStatus(null)
    const nextRemainingMs = Math.max(0, remainingMs + delta * 60_000)
    setRemainingMs(nextRemainingMs)
    if (running) {
      setEndAt(Date.now() + nextRemainingMs)
    }
    if (activeSession && activeSession.level === viewLevel) {
      setActiveSession((current) =>
        current
          ? {
              ...current,
              remainingSeconds: Math.ceil(nextRemainingMs / 1000),
              remainingMs: nextRemainingMs,
              endAt: running ? Date.now() + nextRemainingMs : current.endAt,
              updatedAt: Date.now(),
            }
          : current,
      )
    }
  }

  const startOrResume = () => {
    setResetArmed(false)
    setTransferStatus(null)
    const token = activeSession?.token ?? generateSessionCode(7)
    const nextActiveSession = {
      token,
      level: viewLevel,
      useThirdTime: activeUseThirdTime,
      running: true,
      endAt: Date.now() + remainingMs,
      remainingSeconds: Math.ceil(remainingMs / 1000),
      remainingMs,
      updatedAt: Date.now(),
    }
    setActiveSession(nextActiveSession)
    setRunning(true)
    setEndAt(Date.now() + remainingMs)
  }

  const pauseTimer = () => {
    setResetArmed(false)
    setTransferStatus(null)
    if (endAt !== null) {
      const nextRemainingMs = Math.max(0, endAt - Date.now())
      setRemainingMs(nextRemainingMs)
      setActiveSession((current) =>
        current && current.level === viewLevel
          ? {
              ...current,
              running: false,
              endAt: Date.now() + nextRemainingMs,
              remainingSeconds: Math.ceil(nextRemainingMs / 1000),
              remainingMs: nextRemainingMs,
              updatedAt: Date.now(),
            }
          : current,
      )
    }
    setRunning(false)
    setEndAt(null)
  }

  const resetSession = () => {
    clearCollectiveTimerSession()
    setActiveSession(null)
    setRunning(false)
    setEndAt(null)
    setResetArmed(false)
    setTransferStatus(null)
    setRemainingMs(baseMs)
  }

  const changeExamTrack = (nextTrack: ExamTrack) => {
    setResetArmed(false)
    setTransferStatus(null)
    setExamTrack(nextTrack)

    const nextLevels = getLevelsForTrack(nextTrack)
    const levelMatchesTrack = nextLevels.includes(viewLevel)
    if (!levelMatchesTrack) {
      setViewLevel(nextLevels[0])
    }
  }

  const changeLevel = (nextLevel: CollectiveLevel) => {
    setResetArmed(false)
    setTransferStatus(null)
    setViewLevel(nextLevel)
  }

  const enterFullscreen = async () => {
    if (!fullscreenRootRef.current || document.fullscreenElement) return
    try {
      await fullscreenRootRef.current.requestFullscreen()
    } catch {
      setTransferStatus('Impossible d\'activer le plein écran.')
    }
  }

  const exitFullscreen = async () => {
    if (!document.fullscreenElement) return
    try {
      await document.exitFullscreen()
    } catch {
      setTransferStatus('Impossible de quitter le plein écran.')
    }
  }

  const changeTimeType = (useThirdTimeSelected: boolean) => {
    setResetArmed(false)
    setTransferStatus(null)
    setSelectedUseThirdTime(useThirdTimeSelected)
    const levelConfig = getCollectiveLevelConfig(viewLevel)
    const nextMinutes =
      levelConfig.collectiveTotalMinutes +
      (useThirdTimeSelected ? levelConfig.collectiveThirdTimeExtraMinutes : 0)
    const nextRemainingMs = nextMinutes * 60 * 1000
    const nextEndAt = Date.now() + nextRemainingMs

    setRemainingMs(nextRemainingMs)
    setEndAt(nextEndAt)
    setActiveSession((current) =>
      current && current.level === viewLevel
        ? {
            ...current,
            useThirdTime: useThirdTimeSelected,
            remainingSeconds: Math.ceil(nextRemainingMs / 1000),
            remainingMs: nextRemainingMs,
            endAt: nextEndAt,
            updatedAt: Date.now(),
          }
        : current,
    )
  }

  const generateOfflineSyncCode = async () => {
    const sessionLevel = activeSession?.level ?? viewLevel
    const sessionUseThirdTime = activeSession?.useThirdTime ?? activeUseThirdTime
    const snapshotRemainingMs = running && endAt !== null ? Math.max(0, endAt - Date.now()) : Math.max(0, remainingMs)
    const timeValueMs = running && endAt !== null ? endAt % SYNC_CODE_TIME_MODULO : Math.min(SYNC_CODE_MAX_TIME_VALUE_MS, Math.floor(snapshotRemainingMs))

    try {
      const code = encodeSyncCode({
        level: sessionLevel,
        useThirdTime: sessionUseThirdTime,
        running,
        timeValueMs,
      })

      setSyncCodeInput(code)

      try {
        await navigator.clipboard.writeText(code)
        setTransferStatus(`Code hors ligne genere: ${code} (copie).`)
      } catch {
        setTransferStatus(`Code hors ligne genere: ${code}`)
      }
    } catch {
      setTransferStatus('Impossible de generer le code hors ligne.')
    }
  }

  const importOfflineSyncCode = () => {
    const decoded = decodeSyncCode(syncCodeInput)
    if (!decoded) {
      setTransferStatus('Code hors ligne invalide.')
      return
    }

    const nextTrack = getExamTrackFromLevel(decoded.level)

    const nowMsModulo = Date.now() % SYNC_CODE_TIME_MODULO
    const rawRemainingMs = decoded.running
      ? (decoded.timeValueMs - nowMsModulo + SYNC_CODE_TIME_MODULO) % SYNC_CODE_TIME_MODULO
      : decoded.timeValueMs
    const correctedRemainingMs = decoded.running && rawRemainingMs > SYNC_CODE_MAX_ACTIVE_DURATION_MS ? 0 : rawRemainingMs
    const shouldRun = decoded.running && correctedRemainingMs > 0
    const nextEndAt = Date.now() + correctedRemainingMs

    const nextSession: CollectiveTimerSession = {
      token: generateSessionCode(7),
      level: decoded.level,
      useThirdTime: decoded.useThirdTime,
      running: shouldRun,
      endAt: nextEndAt,
      remainingSeconds: Math.ceil(correctedRemainingMs / 1000),
      remainingMs: correctedRemainingMs,
      updatedAt: Date.now(),
    }

    setResetArmed(false)
  setExamTrack(nextTrack)
    setViewLevel(nextSession.level)
    setSelectedUseThirdTime(nextSession.useThirdTime)
    setActiveSession(nextSession)
    setRemainingMs(correctedRemainingMs)
    setRunning(shouldRun)
    setEndAt(shouldRun ? nextEndAt : null)
    setTransferStatus(
      correctedRemainingMs === 0
        ? 'Code importe mais chrono deja termine.'
        : shouldRun
          ? 'Code importe et chrono relance.'
          : 'Code importe en mode pause.',
    )
  }

  return (
    <section ref={fullscreenRootRef} className={`panel collective-root ${isFullscreen ? 'collective-root--fullscreen' : ''}`}>
      {!isFullscreen && (
        <>
          <div className="panel-head panel-head--collective">
            <h2>Module épreuves collectives</h2>
            <button className="gear-button" type="button" onClick={onOpenSettings} aria-label="Ouvrir les paramètres des durées">
              ⚙
            </button>
          </div>

          <div className="exam-track-row" role="radiogroup" aria-label="Famille d'épreuves">
            {EXAM_TRACK_OPTIONS.map((option) => (
              <label key={option.value} className="exam-track-option" htmlFor={`collective-track-${option.value}`}>
                <input
                  id={`collective-track-${option.value}`}
                  type="radio"
                  name="collective-exam-track"
                  value={option.value}
                  checked={examTrack === option.value}
                  onChange={() => changeExamTrack(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>

          <div className="grid-2">
            <label>
              {isDelfDalfTrack ? 'Niveau' : 'Épreuve'}
              <select value={viewLevel} onChange={(event) => changeLevel(event.target.value as CollectiveLevel)}>
                {visibleLevels.map((value) => (
                  <option key={value} value={value}>
                    {getCollectiveLevelLabel(value)}
                  </option>
                ))}
              </select>
            </label>

            {isDelfDalfTrack && (
              <div className="time-type-column">
                <label>
                  Durée de l'épreuve
                  <select value={selectedUseThirdTime ? 'tiers' : 'normal'} onChange={(event) => changeTimeType(event.target.value === 'tiers')}>
                    <option value="normal">Durée réglementaire</option>
                    <option value="tiers">Durée réglementaire augmentée d'un tiers-temps</option>
                  </select>
                </label>
              </div>
            )}
          </div>
        </>
      )}

      <div className={`timer-face ${isFullscreen ? 'timer-face--fullscreen' : ''}`}>
        {isFullscreen && (
          <button className="ghost fullscreen-exit" type="button" onClick={exitFullscreen}>
            Quitter le plein écran
          </button>
        )}
        {isFullscreen && (
          <div className="fullscreen-logos" aria-hidden="true">
            <div className="fullscreen-logos__slot fullscreen-logos__slot--left">
              {schoolLogo ? (
                <img className="fullscreen-logos__image" src={schoolLogo} alt="" />
              ) : (
                <span className="fullscreen-logos__placeholder">Logo centre</span>
              )}
            </div>
            <div className="fullscreen-logos__slot fullscreen-logos__slot--right">
              <img className="fullscreen-logos__image" src={examLogoSrc} alt={examLogoAlt} />
            </div>
          </div>
        )}
        <div className="timer-face-head">
          <div>
            {activeSession && (
              <p className="timer-label timer-label--locked">
                Chrono actif sur {activeLevel ? getCollectiveLevelLabel(activeLevel) : ''} {activeUseThirdTime ? '(tiers temps)' : '(temps normal)'}
              </p>
            )}
            <p className="timer-label">
              Durée totale : {toHHMM(baseMinutes)} {activeUseThirdTime ? `+ ${toHHMM(thirdTimeExtra)} (tiers temps)` : ''}
            </p>
          </div>

          {!isFullscreen && (
            <label className="seconds-switch seconds-switch--compact">
              <input
                type="checkbox"
                checked={showSeconds}
                onChange={(event) => onShowSecondsChange(event.target.checked)}
              />
              <span>Afficher les secondes</span>
            </label>
          )}
        </div>

        <div className={`timer-core ${isFullscreen ? 'timer-core--fullscreen' : ''}`}>
          <div className={`timer-value timer-value--projector ${isTimeUp ? 'timer-value--time-up' : ''}`} style={{ color: timerColor }}>
            <span className={`timer-readout ${showSeconds ? '' : 'timer-readout--no-seconds'}`}>
              {!showSeconds && (
                <span className="timer-readout__marker timer-readout__marker--left" aria-hidden="true">
                  00
                </span>
              )}
              <span className="timer-readout__value">{formatCountdown(remainingSeconds, showSeconds)}</span>
              {!showSeconds && (
                <span className="timer-readout__marker" aria-hidden="true">
                  00
                </span>
              )}
            </span>
          </div>
          <div className="progress-circle-wrap" role="img" aria-label={`Progression ${progressPercent}%`}>
            <svg className="progress-circle" viewBox="0 0 120 120" aria-hidden="true">
              <circle className="progress-circle__track" cx="60" cy="60" r={progressCircleRadius} />
              <circle
                className="progress-circle__fill"
                cx="60"
                cy="60"
                r={progressCircleRadius}
                style={{
                  strokeDasharray: `${progressCircleCircumference} ${progressCircleCircumference}`,
                  strokeDashoffset: progressCircleOffset,
                  stroke: timerColor,
                }}
              />
            </svg>
            <span className="progress-circle__center">{progressPercent}%</span>
          </div>

          {isFullscreen && (
            <div className="controls-row controls-row--fullscreen">
              {running ? (
                <button className="cta alt" onClick={pauseTimer}>
                  Pause
                </button>
              ) : (
                <button className="cta" onClick={startOrResume}>
                  {remainingMs === activeMinutes * 60 * 1000 ? 'Démarrer' : 'Reprendre'}
                </button>
              )}
              {!resetArmed ? (
                <button className="ghost" onClick={() => setResetArmed(true)}>
                  Réinitialiser
                </button>
              ) : (
                <>
                  <button className="cta alt" onClick={resetSession}>
                    Confirmer la réinitialisation
                  </button>
                  <button className="ghost" onClick={() => setResetArmed(false)}>
                    Annuler
                  </button>
                </>
              )}
              <button className="ghost" onClick={() => adjustMinutes(-1)}>
                -1 min
              </button>
              <button className="ghost" onClick={() => adjustMinutes(1)}>
                +1 min
              </button>
            </div>
          )}
        </div>

        {isFullscreen && (
          <label className="seconds-switch seconds-switch--compact fullscreen-seconds-switch">
            <input
              type="checkbox"
              checked={showSeconds}
              onChange={(event) => onShowSecondsChange(event.target.checked)}
            />
            <span>Afficher les secondes</span>
          </label>
        )}
      </div>

      {!isFullscreen && <div className="controls-row">
        {!running && (
          <button className="cta" onClick={startOrResume}>
            {remainingMs === activeMinutes * 60 * 1000 ? 'Démarrer' : 'Reprendre'}
          </button>
        )}
        {running && (
          <button className="cta alt" onClick={pauseTimer}>
            Pause
          </button>
        )}
        {!resetArmed ? (
          <button className="ghost" onClick={() => setResetArmed(true)}>
            Réinitialiser
          </button>
        ) : (
          <>
            <button className="cta alt" onClick={resetSession}>
              Confirmer la réinitialisation
            </button>
            <button className="ghost" onClick={() => setResetArmed(false)}>
              Annuler
            </button>
          </>
        )}
        <button className="ghost" onClick={() => adjustMinutes(-1)}>
          -1 min
        </button>
        <button className="ghost" onClick={() => adjustMinutes(1)}>
          +1 min
        </button>
      </div>}

      {!isFullscreen && <div className="controls-row transfer-row">
        <button className="ghost" type="button" onClick={generateOfflineSyncCode}>
          Générer code sync.
        </button>
        <input
          className="sync-code-input"
          type="text"
          value={syncCodeInput}
          onChange={(event) => setSyncCodeInput(event.target.value)}
          maxLength={SYNC_CODE_LENGTH}
          placeholder="Ex: 7A2QmX9"
          aria-label="Code de synchronisation hors ligne"
        />
        <button className="ghost" type="button" onClick={importOfflineSyncCode}>
          Charger le code
        </button>
        <button className="ghost fullscreen-toggle fullscreen-toggle--bottom" type="button" onClick={enterFullscreen}>
          Plein écran
        </button>
        {transferStatus && <p className="transfer-status">{transferStatus}</p>}
      </div>}

      {resetArmed && !isFullscreen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setResetArmed(false)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            aria-describedby="reset-description"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="reset-title">Confirmer la réinitialisation</h3>
            <p id="reset-description">Le chrono collectif sera remis à zéro. Cette action est définitive pour la session en cours.</p>
            <div className="controls-row modal-actions">
              <button className="ghost" onClick={() => setResetArmed(false)}>
                Annuler
              </button>
              <button className="cta alt" onClick={resetSession}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}