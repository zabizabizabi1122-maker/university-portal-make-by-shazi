import type { Role } from './roles'

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
export type AnnouncementTarget = 'ALL' | 'STUDENT' | 'FACULTY'

export interface DepartmentOption {
  id: string
  name: string
  code: string
}

export interface DepartmentRow extends DepartmentOption {
  description: string | null
  courseCount: number
  studentCount: number
  facultyCount: number
}

export interface CourseRow {
  id: string
  code: string
  title: string
  credits: number
  departmentId: string
  departmentCode: string
  departmentName: string
  facultyProfileId: string | null
  facultyName: string | null
  enrollmentCount: number
}

export interface UserRow {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
  studentProfileId: string | null
  facultyProfileId: string | null
  rollNumber: string | null
  semester: number | null
  cgpa: number | null
  departmentCode: string | null
  designation: string | null
}

export interface EnrollmentRow {
  id: string
  grade: string | null
  marks: number | null
  studentId: string
  studentName: string
  rollNumber: string
  courseId: string
  courseCode: string
  courseTitle: string
}

export interface AnnouncementRow {
  id: string
  title: string
  content: string
  target: string
  createdAt: string
  authorName: string
}

export interface AdminStats {
  students: number
  faculty: number
  courses: number
  departments: number
  enrollments: number
  announcements: number
}

export interface AdminData {
  stats: AdminStats
  departments: DepartmentRow[]
  courses: CourseRow[]
  users: UserRow[]
  enrollments: EnrollmentRow[]
  announcements: AnnouncementRow[]
}

export interface FacultyStudentRow {
  enrollmentId: string
  studentId: string
  name: string
  rollNumber: string
  grade: string | null
  marks: number | null
}

export interface FacultyCourseRow {
  id: string
  code: string
  title: string
  credits: number
  students: FacultyStudentRow[]
}

export interface FacultyAttendanceRow {
  id: string
  courseId: string
  studentId: string
  /** Calendar day in `YYYY-MM-DD` form (UTC). */
  date: string
  status: AttendanceStatus
}

export interface FacultyProfileInfo {
  name: string
  email: string
  designation: string
  departmentName: string
  departmentCode: string
}

export interface FacultyData {
  profile: FacultyProfileInfo
  courses: FacultyCourseRow[]
  attendance: FacultyAttendanceRow[]
  announcements: AnnouncementRow[]
}
