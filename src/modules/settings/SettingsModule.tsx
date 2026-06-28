import { useEffect, useState, type ChangeEvent } from 'react'
import { DEFAULT_CONFIG } from '../../domain/defaultConfig'
import { LEVELS, type ExamConfig, type Level } from '../../domain/types'
import { toHHMM } from '../../lib/time'

const ALLOWED_LOGO_MIME_TYPES = new Set([
  'image/bmp',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/svg+xml',
  'image/tiff',
  'image/tif',
])

const ALLOWED_LOGO_EXTENSIONS = new Set(['bmp', 'jpg', 'jpeg', 'png', 'svg', 'tif', 'tiff'])

interface SettingsModuleProps {
  config: ExamConfig
  onSave: (next: ExamConfig) => void
  schoolLogo: string | null
  onSaveSchoolLogo: (next: string | null) => void
  onBackToCollective: () => void
}

export function SettingsModule({ config, onSave, schoolLogo, onSaveSchoolLogo, onBackToCollective }: SettingsModuleProps) {
  const [draftConfig, setDraftConfig] = useState<ExamConfig>(config)
  const [draftSchoolLogo, setDraftSchoolLogo] = useState<string | null>(schoolLogo)
  const isDirty = JSON.stringify(draftConfig) !== JSON.stringify(config)
  const isLogoDirty = draftSchoolLogo !== schoolLogo

  useEffect(() => {
    setDraftConfig(config)
  }, [config])

  useEffect(() => {
    setDraftSchoolLogo(schoolLogo)
  }, [schoolLogo])

  const updateOralDuration = (level: Level, value: number) => {
    setDraftConfig((current) => ({
      ...current,
      [level]: {
        ...current[level],
        oralPerCandidateMin: Math.max(1, value),
      },
    }))
  }

  const updateBuffer = (level: Level, value: number) => {
    setDraftConfig((current) => ({
      ...current,
      [level]: {
        ...current[level],
        oralBufferMin: Math.max(0, value),
      },
    }))
  }

  const handleLogoImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    const isAllowedFormat =
      ALLOWED_LOGO_MIME_TYPES.has(file.type.toLowerCase()) || ALLOWED_LOGO_EXTENSIONS.has(extension)

    if (!isAllowedFormat) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null
      setDraftSchoolLogo(result)
      onSaveSchoolLogo(result)
    }
    reader.readAsDataURL(file)
  }
  const clearDraftLogo = () => {
    setDraftSchoolLogo(null)
    onSaveSchoolLogo(null)
  }

  const saveDraft = () => {
    onSave(draftConfig)
    onSaveSchoolLogo(draftSchoolLogo)
  }

  const restoreDefaults = () => {
    setDraftConfig(DEFAULT_CONFIG)
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Paramètres des durées A1 à C2</h2>
        <div className="controls-row settings-actions">
          <button className="ghost" onClick={onBackToCollective}>
            Retour au module collectif
          </button>
          <button className="ghost" onClick={restoreDefaults}>
            Restaurer les valeurs par défaut
          </button>
          <button className={`cta ${isDirty ? '' : 'is-muted'}`} onClick={saveDraft}>
            Enregistrer
          </button>
        </div>
      </div>

      <div className="settings-stack">
        {LEVELS.map((level) => (
          <article key={level} className="settings-level">
            <h3>{level}</h3>

            <div className="settings-info">
              <p>
                <strong>Durée totale:</strong> {toHHMM(draftConfig[level].collectiveTotalMinutes)}
              </p>
              <p>
                <strong>Tiers temps supplémentaire:</strong> {toHHMM(draftConfig[level].collectiveThirdTimeExtraMinutes)}
              </p>
            </div>

            <div className="settings-grid">
              <label>
                Oral par candidat (min)
                <input
                  type="number"
                  min={1}
                  value={draftConfig[level].oralPerCandidateMin}
                  onChange={(event) => updateOralDuration(level, Number(event.target.value))}
                />
              </label>

              <label>
                Buffer oral (min)
                <input
                  type="number"
                  min={0}
                  value={draftConfig[level].oralBufferMin}
                  onChange={(event) => updateBuffer(level, Number(event.target.value))}
                />
              </label>
            </div>
          </article>
        ))}
      </div>

      <section className="settings-logo-card">
        <h3>Logo de l&apos;école</h3>
        <p>Importer une image pour remplacer le logo affiché en haut de l&apos;écran.</p>
        <div className="settings-logo-row">
          <label className="settings-logo-upload">
            Importer un logo
            <input type="file" accept=".bmp,.jpg,.jpeg,.png,.svg,.tif,.tiff,image/bmp,image/jpeg,image/png,image/svg+xml,image/tiff,image/tif" onChange={handleLogoImport} />
          </label>
          <button className="ghost" onClick={clearDraftLogo}>
            Retirer le logo
          </button>
        </div>
        <div className="settings-logo-preview">
          <span>Aperçu</span>
          {draftSchoolLogo ? (
            <img src={draftSchoolLogo} alt="Aperçu du logo" />
          ) : (
            <div className="logo-placeholder logo-placeholder--preview">Aucun logo importé</div>
          )}
          {isLogoDirty && <span className="settings-logo-status">Logo non enregistré</span>}
        </div>
      </section>
    </section>
  )
}