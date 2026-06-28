export function formatCountdown(totalSeconds: number, showSeconds: boolean): string {
  const safe = Math.max(0, totalSeconds)
  const rounded = showSeconds ? safe : Math.ceil(safe / 60) * 60

  const hours = Math.floor(rounded / 3600)
  const minutes = Math.floor((rounded % 3600) / 60)
  const seconds = rounded % 60

  if (showSeconds) {
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }
  return `00:${String(minutes).padStart(2, '0')}`
}

export function toHHMM(totalMinutes: number): string {
  const safe = Math.max(0, Math.floor(totalMinutes))
  const hours = Math.floor(safe / 60)
  const minutes = safe % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function hhmmToMinutes(value: string): number {
  const [hPart, mPart] = value.split(':')
  const hours = Number(hPart)
  const minutes = Number(mPart)

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0
  }

  const safeHours = Math.max(0, Math.floor(hours))
  const safeMinutes = Math.min(59, Math.max(0, Math.floor(minutes)))
  return safeHours * 60 + safeMinutes
}