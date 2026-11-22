import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GRADES } from '@/lib/academics'
import type { AttendanceStatus } from '@/lib/types'

const ALLOWED_STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE']
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function ok(payload: Record<string, unknown> = { success: true }) {
  return NextResponse.json(payload)
}

function id(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Returns the faculty profile of the signed-in user, or null. */
async function getOwnFacultyProfile(userId: string) {
  return prisma.facultyProfile.findUnique({ where: { userId } })
}

/** Confirms the enrollment belongs to a course taught by this faculty member. */
async function getOwnedEnrollment(enrollmentId: string, facultyId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { course: { select: { facultyId: true } } },
  })
  if (!enrollment) return { ok: false as const, response: fail('Enrollment not found.', 404) }
  if (enrollment.course.facultyId !== facultyId) {
    return { ok: false as const, response: fail('You do not teach this course.', 403) }
  }
  return { ok: true as const, enrollment }
}

export async function POST(req: Request) {
  const session = await getCurrentUser()
  if (!session || session.role !== 'FACULTY') {
    return fail('Faculty access required.', 403)
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return fail('Invalid request body.')
  }

  const faculty = await getOwnFacultyProfile(session.userId)
  if (!faculty) return fail('Faculty profile not found.', 404)

  const action = typeof body.action === 'string' ? body.action.trim() : ''

  try {
    switch (action) {
      case 'update_grade': {
        const enrollmentId = id(body.enrollmentId)
        const grade = typeof body.grade === 'string' ? body.grade.trim() : ''
        if (!enrollmentId) return fail('Enrollment id is required.')
        if (grade !== '' && !GRADES.includes(grade as (typeof GRADES)[number])) {
          return fail('Invalid grade.')
        }

        const owned = await getOwnedEnrollment(enrollmentId, faculty.id)
        if (!owned.ok) return owned.response

        await prisma.enrollment.update({
          where: { id: enrollmentId },
          data: { grade: grade || null },
        })
        return ok()
      }

      case 'update_marks': {
        const enrollmentId = id(body.enrollmentId)
        if (!enrollmentId) return fail('Enrollment id is required.')

        const raw = body.marks
        let marks: number | null = null
        if (raw !== '' && raw !== null && raw !== undefined) {
          const parsed = Number(raw)
          if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
            return fail('Marks must be a number between 0 and 100.')
          }
          marks = Math.round(parsed * 10) / 10
        }

        const owned = await getOwnedEnrollment(enrollmentId, faculty.id)
        if (!owned.ok) return owned.response

        await prisma.enrollment.update({ where: { id: enrollmentId }, data: { marks } })
        return ok()
      }

      case 'mark_attendance': {
        const courseId = id(body.courseId)
        const studentId = id(body.studentId)
        const status = body.status
        const date = typeof body.date === 'string' ? body.date.trim() : ''

        if (!courseId || !studentId) return fail('Course and student are required.')
        if (!ALLOWED_STATUSES.includes(status as AttendanceStatus)) {
          return fail('Attendance status must be PRESENT, LATE or ABSENT.')
        }
        if (!DATE_PATTERN.test(date)) return fail('Date must use the YYYY-MM-DD format.')

        const course = await prisma.course.findUnique({
          where: { id: courseId },
          select: { facultyId: true },
        })
        if (!course) return fail('Course not found.', 404)
        if (course.facultyId !== faculty.id) return fail('You do not teach this course.', 403)

        const enrollment = await prisma.enrollment.findUnique({
          where: { studentId_courseId: { studentId, courseId } },
        })
        if (!enrollment) return fail('That student is not enrolled in this course.')

        const attendanceDate = new Date(`${date}T00:00:00.000Z`)
        await prisma.attendance.upsert({
          where: {
            courseId_studentId_date: { courseId, studentId, date: attendanceDate },
          },
          update: { status: status as AttendanceStatus },
          create: {
            courseId,
            studentId,
            date: attendanceDate,
            status: status as AttendanceStatus,
          },
        })
        return ok()
      }

      default:
        return fail('Unknown action.', 400)
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') return fail('The record no longer exists. Refresh and try again.')
      if (error.code === 'P2003') return fail('A related record is missing.')
    }
    console.error('Faculty API error:', error)
    return fail('The update failed. Please try again.', 500)
  }
}
