import { COLLECTIVE_LEVELS, LEVELS, type CollectiveLevel, type ExamConfig } from '../domain/types'

const CONFIG_KEY = 'delf_dalf_config_v1'
const SECONDS_KEY = 'delf_dalf_show_seconds_v1'
const COLLECTIVE_TIMER_KEY = 'delf_dalf_collective_timer_v1'
const SCHOOL_LOGO_KEY = 'delf_dalf_school_logo_v1'

function getSafeStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export interface CollectiveTimerSession {
  token: string
  level: CollectiveLevel
  useThirdTime: boolean
  running: boolean
  endAt: number
  remainingSeconds: number
  remainingMs?: number
  updatedAt: number
}

export function loadConfig(fallback: ExamConfig): ExamConfig {
  const storage = getSafeStorage()
  if (!storage) return fallback

  try {
    const raw = storage.getItem(CONFIG_KEY)
    if (!raw) return fallback

    const parsed = JSON.parse(raw) as Record<string, unknown>
    const normalized: Partial<ExamConfig> = {}

    for (const level of LEVELS) {
      const entry = parsed[level] as Record<string, unknown> | undefined
      if (!entry) return fallback

      const oralPerCandidateMin = asNumber(entry.oralPerCandidateMin, fallback[level].oralPerCandidateMin, 1)
      const oralBufferMin = asNumber(entry.oralBufferMin, fallback[level].oralBufferMin, 0)

      const hasNewShape = typeof entry.collectiveTotalMinutes === 'number'
      const collectiveTotalMinutes = hasNewShape
        ? asNumber(entry.collectiveTotalMinutes, fallback[level].collectiveTotalMinutes, 1)
        : migrateTotalFromOldSections(entry, fallback[level].collectiveTotalMinutes)

      const collectiveThirdTimeExtraMinutes = hasNewShape
        ? asNumber(entry.collectiveThirdTimeExtraMinutes, fallback[level].collectiveThirdTimeExtraMinutes, 0)
        : Math.ceil(collectiveTotalMinutes / 3)

      normalized[level] = {
        collectiveTotalMinutes,
        collectiveThirdTimeExtraMinutes,
        oralPerCandidateMin,
        oralBufferMin,
      }
    }

    return normalized as ExamConfig
  } catch {
    return fallback
  }
}

export function saveConfig(config: ExamConfig): void {
  const storage = getSafeStorage()
  if (!storage) return

  try {
    storage.setItem(CONFIG_KEY, JSON.stringify(config))
  } catch {
    // Ignore storage write errors in restricted contexts.
  }
}

export function loadShowSeconds(): boolean {
  const storage = getSafeStorage()
  if (!storage) return true

  try {
    const value = storage.getItem(SECONDS_KEY)
    if (value === null) return true
    return value === 'true'
  } catch {
    return true
  }
}

export function saveShowSeconds(value: boolean): void {
  const storage = getSafeStorage()
  if (!storage) return

  try {
    storage.setItem(SECONDS_KEY, String(value))
  } catch {
    // Ignore storage write errors in restricted contexts.
  }
}

export function loadSchoolLogo(): string | null {
  const storage = getSafeStorage()
  if (!storage) return null

  try {
    const value = storage.getItem(SCHOOL_LOGO_KEY)
    return value && value.trim().length > 0 ? value : null
  } catch {
    return null
  }
}

export function saveSchoolLogo(value: string | null): void {
  const storage = getSafeStorage()
  if (!storage) return

  if (!value) {
    try {
      storage.removeItem(SCHOOL_LOGO_KEY)
    } catch {
      // Ignore storage write errors in restricted contexts.
    }
    return
  }

  try {
    storage.setItem(SCHOOL_LOGO_KEY, value)
  } catch {
    // Ignore storage write errors in restricted contexts.
  }
}

export function loadCollectiveTimerSession(): CollectiveTimerSession | null {
  const storage = getSafeStorage()
  if (!storage) return null

  try {
    const raw = storage.getItem(COLLECTIVE_TIMER_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<CollectiveTimerSession>
    if (!parsed.token || !parsed.level || typeof parsed.useThirdTime !== 'boolean') return null
    if (typeof parsed.running !== 'boolean' || typeof parsed.updatedAt !== 'number') return null
    const level =
      typeof parsed.level === 'string' && COLLECTIVE_LEVELS.includes(parsed.level as CollectiveLevel)
        ? (parsed.level as CollectiveLevel)
        : null
    if (!level) return null

    if (parsed.running) {
      if (typeof parsed.endAt !== 'number') return null
      const remainingSeconds = Math.max(0, Math.ceil((parsed.endAt - Date.now()) / 1000))
      if (remainingSeconds <= 0) {
        storage.removeItem(COLLECTIVE_TIMER_KEY)
        return null
      }

      return {
        token: parsed.token,
        level,
        useThirdTime: parsed.useThirdTime,
        running: true,
        endAt: parsed.endAt,
        remainingSeconds,
        remainingMs: Math.max(0, parsed.endAt - Date.now()),
        updatedAt: parsed.updatedAt,
      }
    }

    if (typeof parsed.remainingSeconds !== 'number') return null

    return {
      token: parsed.token,
      level,
      useThirdTime: parsed.useThirdTime,
      running: false,
      endAt: typeof parsed.endAt === 'number' ? parsed.endAt : Date.now() + parsed.remainingSeconds * 1000,
      remainingSeconds: Math.max(0, Math.floor(parsed.remainingSeconds)),
      remainingMs:
        typeof parsed.remainingMs === 'number'
          ? Math.max(0, Math.floor(parsed.remainingMs))
          : Math.max(0, Math.floor(parsed.remainingSeconds) * 1000),
      updatedAt: parsed.updatedAt,
    }
  } catch {
    return null
  }
}

export function saveCollectiveTimerSession(session: CollectiveTimerSession): void {
  const storage = getSafeStorage()
  if (!storage) return

  try {
    storage.setItem(COLLECTIVE_TIMER_KEY, JSON.stringify(session))
  } catch {
    // Ignore storage write errors in restricted contexts.
  }
}

export function clearCollectiveTimerSession(): void {
  const storage = getSafeStorage()
  if (!storage) return

  try {
    storage.removeItem(COLLECTIVE_TIMER_KEY)
  } catch {
    // Ignore storage write errors in restricted contexts.
  }
}

function asNumber(value: unknown, fallback: number, min: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.max(min, Math.floor(value))
}

function migrateTotalFromOldSections(entry: Record<string, unknown>, fallback: number): number {
  const sections = entry.collectiveSections
  if (!Array.isArray(sections)) return fallback

  const total = sections.reduce((sum, section) => {
    if (!section || typeof section !== 'object') return sum
    const candidate = section as Record<string, unknown>
    const duration = candidate.durationMin
    if (typeof duration !== 'number' || Number.isNaN(duration)) return sum
    return sum + Math.max(0, duration)
  }, 0)

  return total > 0 ? Math.floor(total) : fallback
}