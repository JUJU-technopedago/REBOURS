import { useEffect, useState } from 'react'
import './App.css'
import { type ExamConfig } from './domain/types'
import { DEFAULT_CONFIG } from './domain/defaultConfig'
import delfLogo from '../FEI_DELF_noir.png'
import dalfLogo from '../FEI_DALF_noir.png'
import tcfTpLogo from '../FEI_TCF_noir.png'
import tcfCanadaLogo from '../FEI_TCF_Canada_noir.png'
import tcfQuebecLogo from '../FEI_TCF_Quebec_noir.png'
import tcfIrnLogo from '../FEI_TCF_IR&N_noir.png'
import { loadConfig, loadSchoolLogo, loadShowSeconds, saveConfig, saveSchoolLogo, saveShowSeconds } from './lib/storage'
import { CollectiveModule, type ExamTrack } from './modules/collective/CollectiveModule'
import { SettingsModule } from './modules/settings/SettingsModule'

// Salle d'oraux conservée dans src/modules/oral/OralRoomModule.tsx pour un développement ultérieur.
type View = 'collective' | 'settings'

const EXAM_LOGOS: Record<ExamTrack, { src: string; alt: string }> = {
  delf: { src: delfLogo, alt: 'Logo DELF' },
  dalf: { src: dalfLogo, alt: 'Logo DALF' },
  'tcf-tp': { src: tcfTpLogo, alt: 'Logo TCF TP' },
  'tcf-canada': { src: tcfCanadaLogo, alt: 'Logo TCF Canada' },
  'tcf-quebec': { src: tcfQuebecLogo, alt: 'Logo TCF Québec' },
  'tcf-irn': { src: tcfIrnLogo, alt: 'Logo TCF IRN' },
}

function App() {
  const [activeView, setActiveView] = useState<View>('collective')
  const [showSeconds, setShowSeconds] = useState<boolean>(() => loadShowSeconds())
  const [config, setConfig] = useState<ExamConfig>(() => loadConfig(DEFAULT_CONFIG))
  const [schoolLogo, setSchoolLogo] = useState<string | null>(() => loadSchoolLogo())
  const [examTrack, setExamTrack] = useState<ExamTrack>('delf')

  useEffect(() => {
    saveConfig(config)
  }, [config])

  useEffect(() => {
    saveShowSeconds(showSeconds)
  }, [showSeconds])

  useEffect(() => {
    saveSchoolLogo(schoolLogo)
  }, [schoolLogo])

  const examLogo = EXAM_LOGOS[examTrack]

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-logo-wrap" aria-label="Logo de l'école">
          {schoolLogo ? (
            <img className="app-logo" src={schoolLogo} alt="Logo de l'école" />
          ) : (
            <div className="logo-placeholder">Logo de l'école (configurable)</div>
          )}
        </div>
        <div className="app-delf-logo-wrap" aria-label={examLogo.alt}>
          <img className="app-delf-logo" src={examLogo.src} alt={examLogo.alt} />
        </div>
      </header>

      <main>
        {activeView === 'collective' && (
          <CollectiveModule
            config={config}
            showSeconds={showSeconds}
            onShowSecondsChange={setShowSeconds}
            onExamTrackChange={setExamTrack}
            onOpenSettings={() => setActiveView('settings')}
            schoolLogo={schoolLogo}
            examLogoSrc={examLogo.src}
            examLogoAlt={examLogo.alt}
          />
        )}
        {activeView === 'settings' && (
          <SettingsModule
            config={config}
            onSave={setConfig}
            schoolLogo={schoolLogo}
            onSaveSchoolLogo={setSchoolLogo}
            onBackToCollective={() => setActiveView('collective')}
          />
        )}
      </main>
    </div>
  )
}

export default App
