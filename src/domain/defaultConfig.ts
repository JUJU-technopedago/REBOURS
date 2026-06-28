import { type ExamConfig } from './types'

export const DEFAULT_CONFIG: ExamConfig = {
  A1: {
    collectiveTotalMinutes: 80,
    collectiveThirdTimeExtraMinutes: 27,
    oralPerCandidateMin: 10,
    oralBufferMin: 2,
  },
  A2: {
    collectiveTotalMinutes: 100,
    collectiveThirdTimeExtraMinutes: 33,
    oralPerCandidateMin: 10,
    oralBufferMin: 2,
  },
  B1: {
    collectiveTotalMinutes: 115,
    collectiveThirdTimeExtraMinutes: 38,
    oralPerCandidateMin: 15,
    oralBufferMin: 3,
  },
  B2: {
    collectiveTotalMinutes: 150,
    collectiveThirdTimeExtraMinutes: 50,
    oralPerCandidateMin: 20,
    oralBufferMin: 3,
  },
  C1: {
    collectiveTotalMinutes: 240,
    collectiveThirdTimeExtraMinutes: 80,
    oralPerCandidateMin: 30,
    oralBufferMin: 5,
  },
  C2: {
    collectiveTotalMinutes: 210,
    collectiveThirdTimeExtraMinutes: 70,
    oralPerCandidateMin: 30,
    oralBufferMin: 5,
  },
}