import { useEffect, useMemo, useState } from 'react'
import { LEVELS, type ExamConfig, type Level } from '../../domain/types'
import { formatCountdown, toHHMM } from '../../lib/time'

type CandidateStatus = 'waiting' | 'current' | 'done' | 'absent'

interface Candidate {
  id: number
  name: string
  remainingSeconds: number
  status: CandidateStatus
}

interface OralRoomModuleProps {
  config: ExamConfig
  showSeconds: boolean
}

function parseCandidateInput(input: string): string[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [firstColumn] = line.split(',')
      return firstColumn.trim()
    })
    .filter((name) => name.toLowerCase() !== 'name')
}

export function OralRoomModule({ config, showSeconds }: OralRoomModuleProps) {
  const [level, setLevel] = useState<Level>('A1')
  const [candidateInput, setCandidateInput] = useState<string>('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [currentIndex, setCurrentIndex] = useState<number | null>(null)
  const [running, setRunning] = useState<boolean>(false)

  const oralDurationSeconds = config[level].oralPerCandidateMin * 60

  const currentCandidate = currentIndex === null ? null : candidates[currentIndex] ?? null

  useEffect(() => {
    if (!running || currentIndex === null) return
    const timer = window.setInterval(() => {
      setCandidates((prev) => {
        if (!prev[currentIndex]) return prev
        const copy = [...prev]
        const updated = { ...copy[currentIndex] }
        updated.remainingSeconds = Math.max(0, updated.remainingSeconds - 1)
        if (updated.remainingSeconds === 0) {
          updated.status = 'done'
        }
        copy[currentIndex] = updated
        return copy
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [running, currentIndex])

  useEffect(() => {
    if (!running || currentIndex === null) return
    const current = candidates[currentIndex]
    if (!current || current.status !== 'done') return

    const nextIndex = candidates.findIndex((item, index) => index > currentIndex && item.status === 'waiting')
    if (nextIndex === -1) {
      setRunning(false)
      setCurrentIndex(null)
      return
    }

    setCandidates((prev) =>
      prev.map((item, index) => (index === nextIndex ? { ...item, status: 'current' } : item)),
    )
    setCurrentIndex(nextIndex)
  }, [candidates, running, currentIndex])

  const importList = () => {
    const names = parseCandidateInput(candidateInput)
    if (!names.length) return

    const created = names.map((name, index) => ({
      id: Date.now() + index,
      name,
      remainingSeconds: oralDurationSeconds,
      status: 'waiting' as CandidateStatus,
    }))
    setCandidates(created)
    setCurrentIndex(null)
    setRunning(false)
  }

  const startSession = () => {
    if (candidates.length === 0) {
      importList()
      return
    }
    const firstWaiting = candidates.findIndex((item) => item.status === 'waiting' || item.status === 'current')
    if (firstWaiting === -1) return

    setCandidates((prev) =>
      prev.map((item, index) => {
        if (index === firstWaiting) return { ...item, status: 'current' }
        if (item.status === 'current') return { ...item, status: 'waiting' }
        return item
      }),
    )
    setCurrentIndex(firstWaiting)
    setRunning(true)
  }

  const nextCandidate = () => {
    if (currentIndex === null) return
    setCandidates((prev) =>
      prev.map((item, index) => {
        if (index === currentIndex) return { ...item, status: 'done', remainingSeconds: 0 }
        return item
      }),
    )
  }

  const markAbsent = () => {
    if (currentIndex === null) return
    setCandidates((prev) =>
      prev.map((item, index) => {
        if (index === currentIndex) return { ...item, status: 'absent', remainingSeconds: 0 }
        return item
      }),
    )
  }

  const extendCurrent = (minutes: number) => {
    if (currentIndex === null) return
    setCandidates((prev) =>
      prev.map((item, index) => {
        if (index !== currentIndex) return item
        return { ...item, remainingSeconds: Math.max(0, item.remainingSeconds + minutes * 60) }
      }),
    )
  }

  const queueStats = useMemo(() => {
    const waiting = candidates.filter((item) => item.status === 'waiting').length
    const done = candidates.filter((item) => item.status === 'done').length
    const absent = candidates.filter((item) => item.status === 'absent').length
    return { waiting, done, absent }
  }, [candidates])

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Module salle de surveillance d&apos;oraux</h2>
      </div>

      <div className="grid-2">
        <label>
          Niveau
          <select value={level} onChange={(event) => setLevel(event.target.value as Level)}>
            {LEVELS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Durée par candidat
          <input type="text" readOnly value={toHHMM(config[level].oralPerCandidateMin)} />
        </label>
      </div>

      <label>
        Import candidats (1 ligne = 1 candidat, CSV accepte colonne 1 = nom)
        <textarea
          rows={5}
          value={candidateInput}
          onChange={(event) => setCandidateInput(event.target.value)}
          placeholder={'Nom Prénom\nNom Prénom\nNom Prénom'}
        />
      </label>

      <div className="controls-row">
        <button className="ghost" onClick={importList}>
          Charger la liste
        </button>
        <button className="cta" onClick={startSession}>
          Démarrer session
        </button>
        <button className="cta alt" onClick={() => setRunning((value) => !value)} disabled={currentIndex === null}>
          {running ? 'Pause' : 'Reprendre'}
        </button>
      </div>

      <div className="timer-face">
        <p className="timer-label">Candidat en cours</p>
        <div className="timer-value">{currentCandidate ? formatCountdown(currentCandidate.remainingSeconds, showSeconds) : '--:--'}</div>
        <p className="subtle-name">{currentCandidate ? currentCandidate.name : 'Aucun candidat actif'}</p>
      </div>

      <div className="controls-row">
        <button className="ghost" onClick={nextCandidate} disabled={currentIndex === null}>
          Candidat suivant
        </button>
        <button className="ghost" onClick={markAbsent} disabled={currentIndex === null}>
          Marquer absent
        </button>
        <button className="ghost" onClick={() => extendCurrent(1)} disabled={currentIndex === null}>
          +1 min
        </button>
        <button className="ghost" onClick={() => extendCurrent(-1)} disabled={currentIndex === null}>
          -1 min
        </button>
      </div>

      <p className="sub">
        En attente : {queueStats.waiting} • Terminés : {queueStats.done} • Absents : {queueStats.absent} • Buffer conseillé :{' '}
        {toHHMM(config[level].oralBufferMin)}
      </p>

      <ul className="queue-list">
        {candidates.map((item) => (
          <li key={item.id} className={`status-${item.status}`}>
            <span>{item.name}</span>
            <span>{item.status}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}