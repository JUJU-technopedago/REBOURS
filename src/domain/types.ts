export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export const TCF_TP_LEVELS = ['TP_CO', 'TP_MSL', 'TP_CE', 'TP_EE'] as const
export const TCF_TP_LEGACY_LEVELS = ['TP'] as const
export const TCF_CANADA_LEVELS = ['CA_CO', 'CA_CE', 'CA_EE'] as const
export const TCF_CANADA_LEGACY_LEVELS = ["Compréhension de l'oral", 'Compréhension écrite', 'Production écrite', 'Compréhension des écrits', 'Épreuve Écrite', 'Canada'] as const
export const TCF_QC_LEVELS = ['QC_CO', 'QC_CE', 'QC_EE'] as const
export const TCF_QC_LEGACY_LEVELS = ['Quebec'] as const
export const TCF_IRN_LEVELS = ['IRN_CO', 'IRN_CE', 'IRN_EE'] as const
export const TCF_IRN_LEGACY_LEVELS = ['IRN'] as const
export const TCF_LEVELS = [
  ...TCF_TP_LEVELS,
  ...TCF_CANADA_LEVELS,
  ...TCF_QC_LEVELS,
  ...TCF_IRN_LEVELS,
  ...TCF_QC_LEGACY_LEVELS,
  ...TCF_TP_LEGACY_LEVELS,
  ...TCF_CANADA_LEGACY_LEVELS,
  ...TCF_IRN_LEGACY_LEVELS,
] as const
export const COLLECTIVE_LEVELS = [...LEVELS, ...TCF_LEVELS] as const

export type Level = (typeof LEVELS)[number]
export type TcfLevel = (typeof TCF_LEVELS)[number]
export type CollectiveLevel = (typeof COLLECTIVE_LEVELS)[number]

export interface LevelConfig {
  collectiveTotalMinutes: number
  collectiveThirdTimeExtraMinutes: number
  oralPerCandidateMin: number
  oralBufferMin: number
}

export type ExamConfig = Record<Level, LevelConfig>