export type Role = 'ADMIN' | 'FACULTY' | 'STUDENT'

export const HOME_BY_ROLE: Record<Role, string> = {
  ADMIN: '/admin',
  FACULTY: '/faculty',
  STUDENT: '/student',
}

export function homeForRole(role: Role): string {
  return HOME_BY_ROLE[role] ?? '/login'
}

export function isRole(value: unknown): value is Role {
  return value === 'ADMIN' || value === 'FACULTY' || value === 'STUDENT'
}
