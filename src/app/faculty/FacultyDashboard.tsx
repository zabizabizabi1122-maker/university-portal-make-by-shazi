'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import {
  EmptyState,
  Pagination,
  SearchField,
  SelectFilter,
  TableToolbar,
  usePagination,
} from '@/components/TableTools'
import type { SessionPayload } from '@/lib/jwt'
import type { FacultyData } from '@/lib/types'
import { GRADES } from '@/lib/academics'
import {
  BookOpen,
  Users,
  CheckCircle,
  Calendar,
  AlertCircle,
  Bell,
  X,
  ClipboardList,
} from 'lucide-react'

type Notice = { type: 'success' | 'error'; text: string } | null

function todayKey(): string {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
}

const inputClass =
  'bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-ink focus:outline-none focus:border-purple-500'

const ATTENDANCE_BUTTON = {
  PRESENT: {
    label: 'Present',
    active: 'bg-emerald-500/25 border-emerald-500/50 text-emerald-300',
    idle: 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-300',
  },
  LATE: {
    label: 'Late',
    active: 'bg-amber-500/25 border-amber-500/50 text-amber-300',
    idle: 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-amber-500/10 hover:text-amber-300',
  },
  ABSENT: {
    label: 'Absent',
    active: 'bg-rose-500/25 border-rose-500/50 text-rose-300',
    idle: 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300',
  },
} as const

export default function FacultyDashboard({
  session,
  data,
}: {
  session: SessionPayload
  data: FacultyData
}) {
  const router = useRouter()
  const [activeCourseId, setActiveCourseId] = useState(data.courses[0]?.id ?? '')
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [notice, setNotice] = useState<Notice>(null)
  const [busy, setBusy] = useState(false)

  const [marksDraft, setMarksDraft] = useState<Record<string, string>>({})
  const [gradeDraft, setGradeDraft] = useState<Record<string, string>>({})
  const [courseQuery, setCourseQuery] = useState('')
  const [studentQuery, setStudentQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState('ALL')

  const currentCourse = data.courses.find((c) => c.id === activeCourseId) ?? data.courses[0]

  const statusFor = (courseId: string, studentId: string, date: string) =>
    data.attendance.find(
      (a) => a.courseId === courseId && a.studentId === studentId && a.date === date,
    )?.status

  const visibleCourses = data.courses.filter((c) =>
    `${c.code} ${c.title}`.toLowerCase().includes(courseQuery.trim().toLowerCase()),
  )
  const visibleStudents = currentCourse
    ? currentCourse.students.filter((student) => {
        const matchesQuery = `${student.name} ${student.rollNumber}`
          .toLowerCase()
          .includes(studentQuery.trim().toLowerCase())
        const matchesGrade =
          gradeFilter === 'ALL' ||
          (gradeFilter === 'GRADED' ? student.grade !== null : student.grade === null)
        return matchesQuery && matchesGrade
      })
    : []
  const studentPages = usePagination(visibleStudents, 8)

  const attendanceCounts = currentCourse
    ? currentCourse.students.reduce(
        (counts, student) => {
          const status = statusFor(currentCourse.id, student.studentId, selectedDate)
          if (status && status in counts) counts[status as keyof typeof counts] += 1
          return counts
        },
        { PRESENT: 0, LATE: 0, ABSENT: 0 },
      )
    : { PRESENT: 0, LATE: 0, ABSENT: 0 }

  async function post(action: string, payload: Record<string, unknown>, successText: string) {
    setBusy(true)
    try {
      const res = await fetch('/api/faculty/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setNotice({ type: 'error', text: json.error ?? 'The update failed.' })
        return
      }
      setNotice({ type: 'success', text: successText })
      router.refresh()
    } catch {
      setNotice({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  const saveMarks = async (enrollmentId: string, value: string) => {
    const trimmed = value.trim()
    if (trimmed !== '' && (Number.isNaN(Number(trimmed)) || Number(trimmed) < 0 || Number(trimmed) > 100)) {
      setNotice({ type: 'error', text: 'Marks must be a number between 0 and 100.' })
      return
    }
    await post('update_marks', { enrollmentId, marks: trimmed }, 'Marks saved.')
  }

  const saveGrade = async (enrollmentId: string, value: string) => {
    await post('update_grade', { enrollmentId, grade: value }, 'Grade saved.')
  }

  const markAttendance = async (studentId: string, status: string) => {
    if (!currentCourse) return
    await post(
      'mark_attendance',
      {
        courseId: currentCourse.id,
        studentId,
        status,
        date: selectedDate,
      },
      `Attendance marked as ${status.toLowerCase()} for ${selectedDate}.`,
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar user={session} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/20 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full mb-3">
              <span>{data.profile.departmentName}</span>
              <span>•</span>
              <span>{data.profile.designation}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink">
              Faculty Workspace: {data.profile.name}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage grading and attendance for the courses assigned to you.
            </p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-5 py-3 text-center">
            <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">
              Assigned Courses
            </span>
            <p className="text-2xl font-bold text-purple-400 mt-1">{data.courses.length}</p>
          </div>
        </div>

        {notice && (
          <div
            className={`p-3 rounded-xl text-sm flex items-start gap-2 border ${
              notice.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}
          >
            {notice.type === 'success' ? (
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <span className="flex-1">{notice.text}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Dismiss message"
              className="opacity-70 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {data.courses.length > 0 && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Select course
              </label>
              <div className="w-full sm:w-72">
                <SearchField
                  value={courseQuery}
                  onChange={setCourseQuery}
                  placeholder="Find a course…"
                  ariaLabel="Search assigned courses"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleCourses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => setActiveCourseId(course.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 border ${
                    currentCourse?.id === course.id
                      ? 'bg-purple-600 border-purple-500 text-paper shadow-lg shadow-purple-600/20'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-ink hover:bg-slate-800'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>
                    {course.code} · {course.title}
                  </span>
                </button>
              ))}
            </div>
            {visibleCourses.length === 0 && (
              <EmptyState
                icon={BookOpen}
                title="No matching courses"
                hint="Try a different course code or title."
                onClear={() => setCourseQuery('')}
              />
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {currentCourse ? (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      Enrolled Students
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Grades and marks save automatically. Attendance applies to the date selected
                      on the right.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      aria-label="Attendance date"
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-[11px]">
                  <span className="font-semibold uppercase tracking-wider text-slate-500">
                    Marked {selectedDate}
                  </span>
                  <span className="text-emerald-300">{attendanceCounts.PRESENT} present</span>
                  <span className="text-amber-300">{attendanceCounts.LATE} late</span>
                  <span className="text-rose-300">{attendanceCounts.ABSENT} absent</span>
                  <span className="text-slate-500">
                    {currentCourse.students.length - attendanceCounts.PRESENT - attendanceCounts.LATE - attendanceCounts.ABSENT} not marked
                  </span>
                </div>

                <TableToolbar>
                  <SearchField
                    value={studentQuery}
                    onChange={(value) => {
                      setStudentQuery(value)
                      studentPages.resetPage()
                    }}
                    placeholder="Search students by name or roll number…"
                    ariaLabel="Search enrolled students"
                  />
                  <SelectFilter
                    value={gradeFilter}
                    onChange={(value) => {
                      setGradeFilter(value)
                      studentPages.resetPage()
                    }}
                    ariaLabel="Filter students by grading status"
                    options={[
                      { value: 'ALL', label: 'All students' },
                      { value: 'GRADED', label: 'Graded' },
                      { value: 'UNGRADED', label: 'Ungraded' },
                    ]}
                  />
                </TableToolbar>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-xs uppercase text-slate-400 tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Roll No</th>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Marks</th>
                        <th className="px-4 py-3">Grade</th>
                        <th className="px-4 py-3 text-center">Attendance · {selectedDate}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {studentPages.pageItems.map((student) => {
                        const status = statusFor(currentCourse.id, student.studentId, selectedDate)
                        return (
                          <tr key={student.enrollmentId} className="hover:bg-slate-800/20 transition">
                            <td className="px-4 py-3 font-mono text-xs text-purple-300">
                              {student.rollNumber}
                            </td>
                            <td className="px-4 py-3 font-medium text-ink">{student.name}</td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                value={
                                  marksDraft[student.enrollmentId] ??
                                  (student.marks === null ? '' : String(student.marks))
                                }
                                onChange={(e) =>
                                  setMarksDraft({ ...marksDraft, [student.enrollmentId]: e.target.value })
                                }
                                onBlur={(e) => {
                                  const original = student.marks === null ? '' : String(student.marks)
                                  if (e.target.value === original) return
                                  void saveMarks(student.enrollmentId, e.target.value)
                                }}
                                placeholder="—"
                                aria-label={`Marks for ${student.name}`}
                                className={`w-20 ${inputClass}`}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={
                                  gradeDraft[student.enrollmentId] ?? student.grade ?? ''
                                }
                                onChange={(e) => {
                                  const value = e.target.value
                                  setGradeDraft({ ...gradeDraft, [student.enrollmentId]: value })
                                  void saveGrade(student.enrollmentId, value)
                                }}
                                aria-label={`Grade for ${student.name}`}
                                className={inputClass}
                              >
                                <option value="">No grade</option>
                                {GRADES.map((grade) => (
                                  <option key={grade} value={grade}>
                                    {grade}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <div className="inline-flex gap-1.5">
                                {(['PRESENT', 'LATE', 'ABSENT'] as const).map((option) => {
                                  const active = status === option
                                  const style = ATTENDANCE_BUTTON[option]
                                  return (
                                    <button
                                      key={option}
                                      type="button"
                                      disabled={busy}
                                      onClick={() => markAttendance(student.studentId, option)}
                                      className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition disabled:opacity-40 ${
                                        active ? style.active : style.idle
                                      }`}
                                    >
                                      {style.label}
                                    </button>
                                  )
                                })}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {visibleStudents.length === 0 && (
                        <tr>
                          <td colSpan={5}>
                            <EmptyState
                              icon={Users}
                              title={
                                currentCourse.students.length === 0
                                  ? 'No students enrolled yet'
                                  : 'No matching students'
                              }
                              hint={
                                currentCourse.students.length === 0
                                  ? 'Ask an administrator to enroll students in this course.'
                                  : 'Try a different name, roll number or grading filter.'
                              }
                              onClear={
                                currentCourse.students.length === 0
                                  ? undefined
                                  : () => {
                                      setStudentQuery('')
                                      setGradeFilter('ALL')
                                      studentPages.resetPage()
                                    }
                              }
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={studentPages.page}
                  pageCount={studentPages.pageCount}
                  total={visibleStudents.length}
                  pageSize={8}
                  onChange={studentPages.setPage}
                  label="students"
                />
              </div>
            ) : (
              <div className="bg-slate-900/40 rounded-2xl border border-slate-800">
                <EmptyState
                  icon={BookOpen}
                  title="No courses assigned yet"
                  hint="Contact the university administrator to get assigned to a course."
                />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              Announcements
            </h2>
            <div className="space-y-4">
              {data.announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                      {announcement.target}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(announcement.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-ink">{announcement.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">
                    {announcement.content}
                  </p>
                </div>
              ))}
              {data.announcements.length === 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-900/40 border border-slate-800 rounded-xl p-4">
                  <ClipboardList className="w-4 h-4" />
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
