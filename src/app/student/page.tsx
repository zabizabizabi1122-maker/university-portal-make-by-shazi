import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { prisma } from '@/lib/prisma'
import { academicStanding, summarizeAttendance } from '@/lib/academics'
import type { StandingTone } from '@/lib/academics'
import { BookOpen, CheckCircle2, Award, Bell, Clock } from 'lucide-react'
import StudentRecords from './StudentRecords'

export const dynamic = 'force-dynamic'

const standingBadge: Record<StandingTone, string> = {
  emerald: 'text-emerald-400',
  blue: 'text-blue-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
}

/** Attendance dates are calendar days stored at UTC midnight, so format them in UTC. */
function formatDay(value: Date): string {
  return value.toLocaleDateString(undefined, {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function StudentDashboard() {
  const session = await requireRole('STUDENT')

  const student = await prisma.studentProfile.findUnique({
    where: { userId: session.userId },
    include: {
      department: true,
      enrollments: {
        include: {
          course: { include: { faculty: { include: { user: true } } } },
        },
        orderBy: { createdAt: 'asc' },
      },
      attendance: {
        include: { course: true },
        orderBy: { date: 'desc' },
      },
    },
  })

  if (!student) {
    redirect('/login')
  }

  const announcements = await prisma.announcement.findMany({
    where: { OR: [{ target: 'ALL' }, { target: 'STUDENT' }] },
    orderBy: { createdAt: 'desc' },
    take: 4,
  })

  const summary = summarizeAttendance(student.attendance.map((a) => a.status))
  const standing = academicStanding(student.cgpa)

  const perCourse = new Map<string, { attended: number; total: number }>()
  for (const record of student.attendance) {
    const entry = perCourse.get(record.courseId) ?? { attended: 0, total: 0 }
    entry.total += 1
    if (record.status === 'PRESENT' || record.status === 'LATE') entry.attended += 1
    perCourse.set(record.courseId, entry)
  }

  const courses = student.enrollments.map((enrollment) => {
    const stats = perCourse.get(enrollment.courseId)
    return {
      id: enrollment.id,
      code: enrollment.course.code,
      title: enrollment.course.title,
      credits: enrollment.course.credits,
      instructor: enrollment.course.faculty?.user.name ?? 'Unassigned',
      marks: enrollment.marks,
      grade: enrollment.grade,
      attendanceRate: stats && stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : null,
      attended: stats?.attended ?? 0,
      total: stats?.total ?? 0,
    }
  })

  const attendance = student.attendance.map((record) => ({
    id: record.id,
    courseCode: record.course.code,
    courseTitle: record.course.title,
    date: formatDay(record.date),
    status: record.status,
  }))

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar user={session} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/20 to-slate-900 border border-blue-500/20 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full mb-3">
              <span>{student.department.name}</span>
              <span>•</span>
              <span>Semester {student.semester}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink">
              Welcome back, {session.name} 👋
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Roll No: <span className="text-ink font-mono">{student.rollNumber}</span>
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-5 py-3 text-center">
              <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">
                Current CGPA
              </span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{student.cgpa.toFixed(2)}</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-5 py-3 text-center">
              <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">
                Attendance
              </span>
              <p className="text-2xl font-bold text-blue-400 mt-1">{summary.rate}%</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Enrolled Courses</p>
              <h3 className="text-2xl font-bold text-ink mt-1">{student.enrollments.length}</h3>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Classes Attended</p>
              <h3 className="text-2xl font-bold text-ink mt-1">
                {summary.attended} / {summary.total}
              </h3>
              {summary.late > 0 && (
                <p className="text-[11px] text-amber-400 mt-0.5">{summary.late} late arrival(s)</p>
              )}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Academic Standing</p>
              <h3 className={`text-2xl font-bold mt-1 ${standingBadge[standing.tone]}`}>
                {standing.label}
              </h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <StudentRecords courses={courses} attendance={attendance} />
          </div>

          <div className="space-y-6">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              Announcements
            </h2>

            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                      Notice
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {announcement.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-ink">{announcement.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">
                    {announcement.content}
                  </p>
                </div>
              ))}
              {announcements.length === 0 && (
                <div className="text-xs text-slate-500 bg-slate-900/40 border border-slate-800 rounded-xl p-4">
                  No announcements right now.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
