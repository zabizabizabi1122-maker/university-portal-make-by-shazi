import { prisma } from './prisma'
import type {
  AdminData,
  AnnouncementRow,
  AttendanceStatus,
  CourseRow,
  DepartmentRow,
  EnrollmentRow,
  FacultyAttendanceRow,
  FacultyCourseRow,
  FacultyData,
  UserRow,
} from './types'

function iso(value: Date): string {
  return value.toISOString()
}

/** Converts an attendance timestamp to its UTC calendar day (`YYYY-MM-DD`). */
export function dayKey(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export async function getAdminData(): Promise<AdminData> {
  const [departments, courses, users, enrollments, announcements] = await Promise.all([
    prisma.department.findMany({
      include: {
        _count: { select: { students: true, faculty: true, courses: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.course.findMany({
      include: {
        department: true,
        faculty: { include: { user: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { code: 'asc' },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        studentProfile: {
          include: { department: { select: { code: true } } },
        },
        facultyProfile: {
          include: { department: { select: { code: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.enrollment.findMany({
      include: {
        student: { include: { user: { select: { name: true } } } },
        course: { select: { code: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.announcement.findMany({
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const departmentRows: DepartmentRow[] = departments.map((d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    description: d.description,
    courseCount: d._count.courses,
    studentCount: d._count.students,
    facultyCount: d._count.faculty,
  }))

  const courseRows: CourseRow[] = courses.map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
    credits: c.credits,
    departmentId: c.departmentId,
    departmentCode: c.department.code,
    departmentName: c.department.name,
    facultyProfileId: c.facultyId,
    facultyName: c.faculty?.user.name ?? null,
    enrollmentCount: c._count.enrollments,
  }))

  const userRows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: iso(u.createdAt),
    studentProfileId: u.studentProfile?.id ?? null,
    facultyProfileId: u.facultyProfile?.id ?? null,
    rollNumber: u.studentProfile?.rollNumber ?? null,
    semester: u.studentProfile?.semester ?? null,
    cgpa: u.studentProfile?.cgpa ?? null,
    departmentCode: u.studentProfile?.department.code ?? u.facultyProfile?.department.code ?? null,
    designation: u.facultyProfile?.designation ?? null,
  }))

  const enrollmentRows: EnrollmentRow[] = enrollments.map((e) => ({
    id: e.id,
    grade: e.grade,
    marks: e.marks,
    studentId: e.studentId,
    studentName: e.student.user.name,
    rollNumber: e.student.rollNumber,
    courseId: e.courseId,
    courseCode: e.course.code,
    courseTitle: e.course.title,
  }))

  const announcementRows: AnnouncementRow[] = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    target: a.target,
    createdAt: iso(a.createdAt),
    authorName: a.author.name,
  }))

  return {
    stats: {
      students: userRows.filter((u) => u.role === 'STUDENT').length,
      faculty: userRows.filter((u) => u.role === 'FACULTY').length,
      courses: courseRows.length,
      departments: departmentRows.length,
      enrollments: enrollmentRows.length,
      announcements: announcementRows.length,
    },
    departments: departmentRows,
    courses: courseRows,
    users: userRows,
    enrollments: enrollmentRows,
    announcements: announcementRows,
  }
}

export async function getFacultyData(userId: string): Promise<FacultyData | null> {
  const faculty = await prisma.facultyProfile.findUnique({
    where: { userId },
    include: {
      user: true,
      department: true,
      courses: {
        include: {
          enrollments: {
            include: { student: { include: { user: true } } },
            orderBy: { createdAt: 'asc' },
          },
          attendance: { orderBy: { date: 'desc' } },
        },
        orderBy: { code: 'asc' },
      },
    },
  })

  if (!faculty) return null

  const announcements = await prisma.announcement.findMany({
    where: { OR: [{ target: 'ALL' }, { target: 'FACULTY' }] },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const courses: FacultyCourseRow[] = faculty.courses.map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
    credits: c.credits,
    students: c.enrollments.map((e) => ({
      enrollmentId: e.id,
      studentId: e.studentId,
      name: e.student.user.name,
      rollNumber: e.student.rollNumber,
      grade: e.grade,
      marks: e.marks,
    })),
  }))

  const attendance: FacultyAttendanceRow[] = faculty.courses.flatMap((c) =>
    c.attendance.map((a) => ({
      id: a.id,
      courseId: c.id,
      studentId: a.studentId,
      date: dayKey(a.date),
      status: a.status as AttendanceStatus,
    })),
  )

  return {
    profile: {
      name: faculty.user.name,
      email: faculty.user.email,
      designation: faculty.designation,
      departmentName: faculty.department.name,
      departmentCode: faculty.department.code,
    },
    courses,
    attendance,
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      target: a.target,
      createdAt: iso(a.createdAt),
      authorName: a.author.name,
    })),
  }
}
