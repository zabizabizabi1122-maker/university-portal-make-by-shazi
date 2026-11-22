import type { AttendanceStatus } from './types'

/** Letter grades offered by the faculty grading UI and accepted by the API. */
export const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'] as const
export type Grade = (typeof GRADES)[number]

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['PRESENT', 'LATE', 'ABSENT']

export interface AttendanceSummary {
  total: number
  present: number
  late: number
  absent: number
  excused: number
  attended: number
  rate: number
}

/** Late arrivals count as attended; excused absences are reported separately. */
export function summarizeAttendance(statuses: AttendanceStatus[]): AttendanceSummary {
  const total = statuses.length
  const present = statuses.filter((s) => s === 'PRESENT').length
  const late = statuses.filter((s) => s === 'LATE').length
  const absent = statuses.filter((s) => s === 'ABSENT').length
  const excused = statuses.filter((s) => s === 'EXCUSED').length
  const attended = present + late
  return {
    total,
    present,
    late,
    absent,
    excused,
    attended,
    rate: total > 0 ? Math.round((attended / total) * 100) : 100,
  }
}

export type StandingTone = 'emerald' | 'blue' | 'amber' | 'rose'

export function academicStanding(cgpa: number): { label: string; tone: StandingTone } {
  if (cgpa >= 3.5) return { label: 'Excellent', tone: 'emerald' }
  if (cgpa >= 3.0) return { label: 'Good', tone: 'blue' }
  if (cgpa >= 2.0) return { label: 'Satisfactory', tone: 'amber' }
  return { label: 'Needs Improvement', tone: 'rose' }
}
