'use client'

import { useState } from 'react'
import { BookOpen, Calendar } from 'lucide-react'
import {
  EmptyState,
  Pagination,
  SearchField,
  SelectFilter,
  TableToolbar,
  usePagination,
} from '@/components/TableTools'
import type { AttendanceStatus } from '@/lib/types'

export interface StudentCourseView {
  id: string
  code: string
  title: string
  credits: number
  instructor: string
  marks: number | null
  grade: string | null
  attendanceRate: number | null
  attended: number
  total: number
}

export interface StudentAttendanceView {
  id: string
  courseCode: string
  courseTitle: string
  /** Pre-formatted on the server so no Date parsing happens in the browser. */
  date: string
  status: AttendanceStatus
}

const ATTENDANCE_BADGE: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  LATE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ABSENT: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  EXCUSED: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
}

export default function StudentRecords({
  courses,
  attendance,
}: {
  courses: StudentCourseView[]
  attendance: StudentAttendanceView[]
}) {
  const [courseQuery, setCourseQuery] = useState('')
  const [courseFilter, setCourseFilter] = useState('ALL')
  const [attendanceQuery, setAttendanceQuery] = useState('')
  const [attendanceStatus, setAttendanceStatus] = useState('ALL')
  const [attendanceCourse, setAttendanceCourse] = useState('ALL')

  const visibleCourses = courses.filter((course) => {
    const haystack = `${course.code} ${course.title} ${course.instructor} ${course.grade ?? ''}`
      .toLowerCase()
      .includes(courseQuery.trim().toLowerCase())
    const matchesFilter =
      courseFilter === 'ALL' ||
      (courseFilter === 'GRADED' ? course.grade !== null : course.grade === null)
    return haystack && matchesFilter
  })
  const coursePages = usePagination(visibleCourses, 5)

  const visibleAttendance = attendance.filter((record) => {
    const haystack = `${record.courseCode} ${record.courseTitle} ${record.date} ${record.status}`
      .toLowerCase()
      .includes(attendanceQuery.trim().toLowerCase())
    return (
      haystack &&
      (attendanceStatus === 'ALL' || record.status === attendanceStatus) &&
      (attendanceCourse === 'ALL' || record.courseCode === attendanceCourse)
    )
  })
  const attendancePages = usePagination(visibleAttendance, 5)

  const courseOptions = courses.map((course) => ({
    value: course.code,
    label: `${course.code} · ${course.title}`,
  }))

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            Enrolled Courses &amp; Results
          </h2>
          <span className="text-xs text-slate-500">
            {visibleCourses.length} of {courses.length} courses
          </span>
        </div>

        <TableToolbar>
          <SearchField
            value={courseQuery}
            onChange={(value) => {
              setCourseQuery(value)
              coursePages.resetPage()
            }}
            placeholder="Search course, instructor, grade…"
            ariaLabel="Search enrolled courses"
          />
          <SelectFilter
            value={courseFilter}
            onChange={(value) => {
              setCourseFilter(value)
              coursePages.resetPage()
            }}
            ariaLabel="Filter courses by grade status"
            options={[
              { value: 'ALL', label: 'All courses' },
              { value: 'GRADED', label: 'Graded' },
              { value: 'PENDING', label: 'Results pending' },
            ]}
          />
        </TableToolbar>

        <div className="space-y-4">
          {coursePages.pageItems.map((course) => (
            <div
              key={course.id}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {course.code}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {course.credits} Credits
                  </span>
                  {course.attendanceRate !== null && (
                    <span className="text-[11px] text-slate-500">
                      Attendance {course.attendanceRate}% · {course.attended}/{course.total} classes
                    </span>
                  )}
                </div>
                <h3 className="text-base font-semibold text-ink mt-1.5">{course.title}</h3>
                <p className="text-xs text-slate-400 mt-1">Instructor: {course.instructor}</p>
                {course.attendanceRate !== null && (
                  <div className="mt-3 h-1.5 w-full max-w-xs bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        course.attendanceRate >= 75
                          ? 'bg-emerald-500'
                          : course.attendanceRate >= 60
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                      }`}
                      style={{ width: `${course.attendanceRate}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Marks</p>
                  <p className="text-sm font-semibold text-slate-200 mt-0.5">
                    {course.marks === null ? 'Pending' : `${course.marks}%`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Grade</p>
                  <span className="inline-block mt-0.5 text-base font-bold px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
                    {course.grade ?? 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {visibleCourses.length === 0 && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl">
              <EmptyState
                icon={BookOpen}
                title={courses.length === 0 ? 'No courses enrolled yet' : 'No matching courses'}
                hint={
                  courses.length === 0
                    ? 'Contact the administration if you are missing a course.'
                    : 'Try a different search term or grade filter.'
                }
                onClear={
                  courses.length === 0
                    ? undefined
                    : () => {
                        setCourseQuery('')
                        setCourseFilter('ALL')
                        coursePages.resetPage()
                      }
                }
              />
            </div>
          )}
        </div>
        {visibleCourses.length > 0 && (
          <div className="bg-slate-900/40 border border-slate-800 border-t-0 rounded-b-xl">
            <Pagination
              page={coursePages.page}
              pageCount={coursePages.pageCount}
              total={visibleCourses.length}
              pageSize={5}
              onChange={coursePages.setPage}
              label="courses"
            />
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            Attendance History
          </h2>
          <span className="text-xs text-slate-500">
            {visibleAttendance.length} of {attendance.length} records
          </span>
        </div>

        <TableToolbar>
          <SearchField
            value={attendanceQuery}
            onChange={(value) => {
              setAttendanceQuery(value)
              attendancePages.resetPage()
            }}
            placeholder="Search course or date…"
            ariaLabel="Search attendance records"
          />
          <SelectFilter
            value={attendanceCourse}
            onChange={(value) => {
              setAttendanceCourse(value)
              attendancePages.resetPage()
            }}
            ariaLabel="Filter attendance by course"
            options={[{ value: 'ALL', label: 'All courses' }, ...courseOptions]}
          />
          <SelectFilter
            value={attendanceStatus}
            onChange={(value) => {
              setAttendanceStatus(value)
              attendancePages.resetPage()
            }}
            ariaLabel="Filter attendance by status"
            options={[
              { value: 'ALL', label: 'All statuses' },
              { value: 'PRESENT', label: 'Present' },
              { value: 'LATE', label: 'Late' },
              { value: 'ABSENT', label: 'Absent' },
              { value: 'EXCUSED', label: 'Excused' },
            ]}
          />
        </TableToolbar>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {attendancePages.pageItems.map((record) => (
                <tr key={record.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-5 py-3 font-medium text-ink">
                    {record.courseCode} · {record.courseTitle}
                  </td>
                  <td className="px-5 py-3 text-slate-400">{record.date}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        ATTENDANCE_BADGE[record.status]
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
              {visibleAttendance.length === 0 && (
                <tr>
                  <td colSpan={3}>
                    <EmptyState
                      icon={Calendar}
                      title={attendance.length === 0 ? 'No attendance recorded yet' : 'No matching records'}
                      hint={
                        attendance.length === 0
                          ? 'Your faculty will mark attendance after classes.'
                          : 'Try a different course, status or search term.'
                      }
                      onClear={
                        attendance.length === 0
                          ? undefined
                          : () => {
                              setAttendanceQuery('')
                              setAttendanceCourse('ALL')
                              setAttendanceStatus('ALL')
                              attendancePages.resetPage()
                            }
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {visibleAttendance.length > 0 && (
            <Pagination
              page={attendancePages.page}
              pageCount={attendancePages.pageCount}
              total={visibleAttendance.length}
              pageSize={5}
              onChange={attendancePages.setPage}
              label="records"
            />
          )}
        </div>
      </section>
    </div>
  )
}
