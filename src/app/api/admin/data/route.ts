import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/crypto'
import { isRole } from '@/lib/roles'
import type { AnnouncementTarget } from '@/lib/types'

const TARGETS: AnnouncementTarget[] = ['ALL', 'STUDENT', 'FACULTY']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function ok(payload: Record<string, unknown> = { success: true }) {
  return NextResponse.json(payload)
}

function text(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function id(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toCredits(value: unknown): number {
  const credits = Number(value)
  return Number.isInteger(credits) && credits >= 1 && credits <= 6 ? credits : 3
}

function describePrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target)
        ? (error.meta?.target as string[]).join(', ')
        : String(error.meta?.target ?? '')
      if (target.includes('email')) return 'That email address is already registered.'
      if (target.includes('rollNumber')) return 'That roll number is already in use.'
      if (target.includes('studentId') && target.includes('courseId')) {
        return 'That student is already enrolled in this course.'
      }
      if (target.includes('code')) return 'That code is already in use.'
      return 'A record with those unique values already exists.'
    }
    if (error.code === 'P2003') return 'A related record is missing. Check the selected department or course.'
    if (error.code === 'P2025') return 'The record no longer exists. Refresh and try again.'
  }
  return 'The action failed. Please try again.'
}

export async function POST(req: Request) {
  const session = await getCurrentUser()
  if (!session || session.role !== 'ADMIN') {
    return fail('Administrator access required.', 403)
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return fail('Invalid request body.')
  }

  const action = text(body.action, 40)

  try {
    switch (action) {
      /* ------------------------------- courses ------------------------------ */
      case 'create_course': {
        const code = text(body.code, 20).toUpperCase()
        const title = text(body.title, 120)
        const departmentId = id(body.departmentId)
        const facultyId = id(body.facultyId)

        if (!code || !title) return fail('Course code and title are required.')
        if (!departmentId) return fail('Select a department for this course.')

        const course = await prisma.course.create({
          data: {
            code,
            title,
            credits: toCredits(body.credits),
            departmentId,
            facultyId: facultyId || null,
          },
        })
        return ok({ success: true, id: course.id })
      }

      case 'update_course': {
        const courseId = id(body.id)
        const code = text(body.code, 20).toUpperCase()
        const title = text(body.title, 120)
        const departmentId = id(body.departmentId)
        const facultyId = id(body.facultyId)

        if (!courseId) return fail('Course id is required.')
        if (!code || !title) return fail('Course code and title are required.')
        if (!departmentId) return fail('Select a department for this course.')

        await prisma.course.update({
          where: { id: courseId },
          data: {
            code,
            title,
            credits: toCredits(body.credits),
            departmentId,
            facultyId: facultyId || null,
          },
        })
        return ok()
      }

      case 'delete_course': {
        const courseId = id(body.id)
        if (!courseId) return fail('Course id is required.')
        await prisma.course.delete({ where: { id: courseId } })
        return ok()
      }

      /* ----------------------------- departments ---------------------------- */
      case 'create_department': {
        const name = text(body.name, 120)
        const code = text(body.code, 20).toUpperCase()
        const description = text(body.description, 500)

        if (!name || !code) return fail('Department name and code are required.')

        const department = await prisma.department.create({
          data: { name, code, description: description || null },
        })
        return ok({ success: true, id: department.id })
      }

      case 'update_department': {
        const departmentId = id(body.id)
        const name = text(body.name, 120)
        const code = text(body.code, 20).toUpperCase()
        const description = text(body.description, 500)

        if (!departmentId) return fail('Department id is required.')
        if (!name || !code) return fail('Department name and code are required.')

        await prisma.department.update({
          where: { id: departmentId },
          data: { name, code, description: description || null },
        })
        return ok()
      }

      case 'delete_department': {
        const departmentId = id(body.id)
        if (!departmentId) return fail('Department id is required.')

        const department = await prisma.department.findUnique({
          where: { id: departmentId },
          include: { _count: { select: { courses: true, students: true, faculty: true } } },
        })
        if (!department) return fail('Department not found.', 404)

        const inUse =
          department._count.courses + department._count.students + department._count.faculty
        if (inUse > 0) {
          return fail(
            'This department still has courses, students or faculty. Reassign or remove them first.',
          )
        }

        await prisma.department.delete({ where: { id: departmentId } })
        return ok()
      }

      /* ----------------------------- enrollments ---------------------------- */
      case 'create_enrollment': {
        const studentId = id(body.studentId)
        const courseId = id(body.courseId)

        if (!studentId || !courseId) return fail('Select both a student and a course.')

        const [student, course] = await Promise.all([
          prisma.studentProfile.findUnique({ where: { id: studentId } }),
          prisma.course.findUnique({ where: { id: courseId } }),
        ])
        if (!student) return fail('Student not found.', 404)
        if (!course) return fail('Course not found.', 404)

        const existing = await prisma.enrollment.findUnique({
          where: { studentId_courseId: { studentId, courseId } },
        })
        if (existing) return fail('That student is already enrolled in this course.')

        const enrollment = await prisma.enrollment.create({ data: { studentId, courseId } })
        return ok({ success: true, id: enrollment.id })
      }

      case 'delete_enrollment': {
        const enrollmentId = id(body.id)
        if (!enrollmentId) return fail('Enrollment id is required.')
        await prisma.enrollment.delete({ where: { id: enrollmentId } })
        return ok()
      }

      /* ------------------------------- users -------------------------------- */
      case 'create_user': {
        const name = text(body.name, 120)
        const email = text(body.email, 254).toLowerCase()
        const password = typeof body.password === 'string' ? body.password : ''
        const role = body.role
        const departmentId = id(body.departmentId)
        const rollNumber = text(body.rollNumber, 40)
        const designation = text(body.designation, 80)

        if (!name) return fail('Full name is required.')
        if (!EMAIL_PATTERN.test(email)) return fail('Enter a valid email address.')
        if (password.length < 6) return fail('Password must be at least 6 characters.')
        if (!isRole(role)) return fail('Select a valid role.')
        if (role !== 'ADMIN' && !departmentId) {
          return fail('Select a department for students and faculty.')
        }
        if (role === 'STUDENT' && !rollNumber) return fail('Roll number is required for students.')

        const user = await prisma.user.create({
          data: {
            name,
            email,
            password: hashPassword(password),
            role,
            ...(role === 'STUDENT'
              ? {
                  studentProfile: {
                    create: { rollNumber, departmentId, semester: 1 },
                  },
                }
              : {}),
            ...(role === 'FACULTY'
              ? {
                  facultyProfile: {
                    create: {
                      designation: designation || 'Assistant Professor',
                      departmentId,
                    },
                  },
                }
              : {}),
          },
        })
        return ok({ success: true, id: user.id })
      }

      case 'reset_password': {
        const userId = id(body.id)
        const password = typeof body.password === 'string' ? body.password : ''
        if (!userId) return fail('User id is required.')
        if (password.length < 6) return fail('Password must be at least 6 characters.')

        await prisma.user.update({
          where: { id: userId },
          data: { password: hashPassword(password) },
        })
        return ok()
      }

      case 'delete_user': {
        const userId = id(body.id)
        if (!userId) return fail('User id is required.')
        if (userId === session.userId) return fail('You cannot delete your own account.')

        await prisma.$transaction([
          prisma.announcement.deleteMany({ where: { authorId: userId } }),
          prisma.user.delete({ where: { id: userId } }),
        ])
        return ok()
      }

      /* ----------------------------- announcements -------------------------- */
      case 'create_announcement': {
        const title = text(body.title, 160)
        const content = text(body.content, 4000)
        const target = body.target
        if (!title || !content) return fail('Announcement title and body are required.')
        if (!TARGETS.includes(target as AnnouncementTarget)) return fail('Select a valid audience.')

        const announcement = await prisma.announcement.create({
          data: {
            title,
            content,
            target: target as AnnouncementTarget,
            authorId: session.userId,
          },
        })
        return ok({ success: true, id: announcement.id })
      }

      case 'delete_announcement': {
        const announcementId = id(body.id)
        if (!announcementId) return fail('Announcement id is required.')
        await prisma.announcement.delete({ where: { id: announcementId } })
        return ok()
      }

      default:
        return fail('Unknown action.', 400)
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return fail(describePrismaError(error))
    }
    console.error('Admin API error:', error)
    return fail('The action failed. Please try again.', 500)
  }
}
