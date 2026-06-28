import { Component, type ErrorInfo, type ReactNode } from 'react'

interface CrashBoundaryProps {
  children: ReactNode
}

interface CrashBoundaryState {
  hasError: boolean
  message: string
}

export class CrashBoundary extends Component<CrashBoundaryProps, CrashBoundaryState> {
  state: CrashBoundaryState = {
    hasError: false,
    message: '',
  }

  static getDerivedStateFromError(error: unknown): CrashBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    console.error('Application crash:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          style={{
            fontFamily: 'Segoe UI, Tahoma, sans-serif',
            maxWidth: '780px',
            margin: '48px auto',
            padding: '24px',
            border: '1px solid #d7d7d7',
            borderRadius: '12px',
            background: '#fff',
            color: '#1f1f1f',
          }}
        >
          <h1 style={{ marginTop: 0 }}>L'application a rencontré une erreur</h1>
          <p>
            La page ne peut pas s'afficher correctement. Fermez cet onglet, relancez la build, puis
            réessayez.
          </p>
          <p>
            Détail: <strong>{this.state.message}</strong>
          </p>
        </main>
      )
    }

    return this.props.children
  }
}
