'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Modal from '@/components/Modal'
import {
  EmptyState,
  Pagination,
  SearchField,
  SelectFilter,
  TableToolbar,
  usePagination,
} from '@/components/TableTools'
import type { SessionPayload } from '@/lib/jwt'
import type {
  AdminData,
  AnnouncementRow,
  CourseRow,
  DepartmentRow,
  UserRow,
} from '@/lib/types'
import {
  Users,
  BookOpen,
  Building2,
  Bell,
  PlusCircle,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  ClipboardList,
  Pencil,
  Trash2,
  KeyRound,
  X,
} from 'lucide-react'

type Tab = 'overview' | 'courses' | 'departments' | 'enrollments' | 'announcements'
type Notice = { type: 'success' | 'error'; text: string } | null

const inputClass =
  'w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-emerald-500'
const labelClass = 'text-xs text-slate-400 font-semibold block mb-1'
const primaryButton =
  'w-full mt-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-paper font-medium py-2.5 rounded-xl transition text-sm shadow-lg shadow-emerald-600/20'
const cardClass = 'bg-slate-900/80 border border-slate-800 rounded-2xl p-6'
const roleBadgeClass: Record<string, string> = {
  ADMIN: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  FACULTY: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  STUDENT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

interface AdminDashboardProps {
  session: SessionPayload
  data: AdminData
}

export default function AdminDashboard({ session, data }: AdminDashboardProps) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [notice, setNotice] = useState<Notice>(null)
  const [busy, setBusy] = useState(false)

  const firstDepartment = data.departments[0]?.id ?? ''

  const [courseForm, setCourseForm] = useState({
    code: '',
    title: '',
    credits: 3,
    departmentId: firstDepartment,
    facultyId: '',
  })
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' })
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT' as 'ADMIN' | 'FACULTY' | 'STUDENT',
    departmentId: firstDepartment,
    rollNumber: '',
    designation: '',
  })
  const [annForm, setAnnForm] = useState({ title: '', content: '', target: 'ALL' })
  const [enrollForm, setEnrollForm] = useState({ studentId: '', courseId: '' })

  const [editingCourse, setEditingCourse] = useState<CourseRow | null>(null)
  const [editingDepartment, setEditingDepartment] = useState<DepartmentRow | null>(null)
  const [passwordUser, setPasswordUser] = useState<UserRow | null>(null)

  const students = data.users.filter((u) => u.role === 'STUDENT' && u.studentProfileId)
  const facultyUsers = data.users.filter((u) => u.role === 'FACULTY' && u.facultyProfileId)

  const [userQuery, setUserQuery] = useState('')
  const [userRole, setUserRole] = useState('ALL')
  const [courseQuery, setCourseQuery] = useState('')
  const [courseDepartment, setCourseDepartment] = useState('ALL')
  const [departmentQuery, setDepartmentQuery] = useState('')
  const [enrollmentQuery, setEnrollmentQuery] = useState('')
  const [enrollmentCourse, setEnrollmentCourse] = useState('ALL')
  const [announcementQuery, setAnnouncementQuery] = useState('')
  const [announcementTarget, setAnnouncementTarget] = useState('EVERYONE')

  const visibleUsers = data.users.filter((u) => {
    const haystack = `${u.name} ${u.email} ${u.rollNumber ?? ''} ${u.designation ?? ''} ${
      u.departmentCode ?? ''
    }`.toLowerCase()
    return (
      haystack.includes(userQuery.trim().toLowerCase()) &&
      (userRole === 'ALL' || u.role === userRole)
    )
  })
  const visibleCourses = data.courses.filter((c) => {
    const haystack = `${c.code} ${c.title} ${c.facultyName ?? ''} ${c.departmentCode}`.toLowerCase()
    return (
      haystack.includes(courseQuery.trim().toLowerCase()) &&
      (courseDepartment === 'ALL' || c.departmentId === courseDepartment)
    )
  })
  const visibleDepartments = data.departments.filter((d) =>
    `${d.name} ${d.code} ${d.description ?? ''}`.toLowerCase().includes(departmentQuery.trim().toLowerCase()),
  )
  const visibleEnrollments = data.enrollments.filter((e) => {
    const haystack = `${e.studentName} ${e.rollNumber} ${e.courseCode} ${e.courseTitle} ${e.grade ?? ''}`.toLowerCase()
    return (
      haystack.includes(enrollmentQuery.trim().toLowerCase()) &&
      (enrollmentCourse === 'ALL' || e.courseId === enrollmentCourse)
    )
  })
  const visibleAnnouncements = data.announcements.filter((a) => {
    const haystack = `${a.title} ${a.content} ${a.authorName} ${a.target}`.toLowerCase()
    return (
      haystack.includes(announcementQuery.trim().toLowerCase()) &&
      (announcementTarget === 'EVERYONE' || a.target === announcementTarget)
    )
  })

  const userPages = usePagination(visibleUsers, 8)
  const coursePages = usePagination(visibleCourses, 8)
  const departmentPages = usePagination(visibleDepartments, 6)
  const enrollmentPages = usePagination(visibleEnrollments, 8)
  const announcementPages = usePagination(visibleAnnouncements, 5)

  async function run(
    action: string,
    payload: Record<string, unknown>,
    successText: string,
  ): Promise<boolean> {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setNotice({ type: 'error', text: json.error ?? 'The action failed.' })
        return false
      }
      setNotice({ type: 'success', text: successText })
      router.refresh()
      return true
    } catch {
      setNotice({ type: 'error', text: 'Network error. Please try again.' })
      return false
    } finally {
      setBusy(false)
    }
  }

  const handleCreateCourse = async (event: FormEvent) => {
    event.preventDefault()
    const created = await run('create_course', courseForm, 'Course created.')
    if (created) setCourseForm({ ...courseForm, code: '', title: '', credits: 3, facultyId: '' })
  }

  const handleCreateDepartment = async (event: FormEvent) => {
    event.preventDefault()
    const created = await run('create_department', deptForm, 'Department created.')
    if (created) setDeptForm({ name: '', code: '', description: '' })
  }

  const handleCreateUser = async (event: FormEvent) => {
    event.preventDefault()
    const created = await run('create_user', userForm, 'User account created.')
    if (created) {
      setUserForm({
        ...userForm,
        name: '',
        email: '',
        password: '',
        rollNumber: '',
        designation: '',
      })
    }
  }

  const handleCreateAnnouncement = async (event: FormEvent) => {
    event.preventDefault()
    const created = await run('create_announcement', annForm, 'Announcement published.')
    if (created) setAnnForm({ title: '', content: '', target: 'ALL' })
  }

  const handleCreateEnrollment = async (event: FormEvent) => {
    event.preventDefault()
    const created = await run('create_enrollment', enrollForm, 'Student enrolled.')
    if (created) setEnrollForm({ ...enrollForm, studentId: '' })
  }

  const handleDelete = async (action: string, id: string, label: string) => {
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return
    await run(action, { id }, `${label} deleted.`)
  }

  const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: 'overview', label: 'Users & Accounts', icon: Users },
    { key: 'courses', label: 'Courses', icon: BookOpen },
    { key: 'departments', label: 'Departments', icon: Building2 },
    { key: 'enrollments', label: 'Enrollments', icon: ClipboardList },
    { key: 'announcements', label: 'Announcements', icon: Bell },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar user={session} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-2xl p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Full Administrative Access</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink">University Management System</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage accounts, curriculum, departments, enrollments and campus notices.
          </p>
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Students" value={data.stats.students} tone="text-blue-400" />
          <StatCard label="Faculty" value={data.stats.faculty} tone="text-purple-400" />
          <StatCard label="Courses" value={data.stats.courses} tone="text-emerald-400" />
          <StatCard label="Departments" value={data.stats.departments} tone="text-amber-400" />
          <StatCard label="Enrollments" value={data.stats.enrollments} tone="text-cyan-400" />
          <StatCard label="Notices" value={data.stats.announcements} tone="text-rose-400" />
        </div>

        <div className="flex flex-wrap border-b border-slate-800 gap-4">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition ${
                tab === key
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`lg:col-span-2 ${cardClass}`}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-ink">User Directory</h2>
                <span className="text-xs text-slate-500">
                  {visibleUsers.length} of {data.users.length} accounts
                </span>
              </div>
              <TableToolbar>
                <SearchField
                  value={userQuery}
                  onChange={(value) => {
                    setUserQuery(value)
                    userPages.resetPage()
                  }}
                  placeholder="Search name, email, roll number…"
                  ariaLabel="Search users"
                />
                <SelectFilter
                  value={userRole}
                  onChange={(value) => {
                    setUserRole(value)
                    userPages.resetPage()
                  }}
                  ariaLabel="Filter users by role"
                  options={[
                    { value: 'ALL', label: 'All roles' },
                    { value: 'STUDENT', label: 'Students' },
                    { value: 'FACULTY', label: 'Faculty' },
                    { value: 'ADMIN', label: 'Admins' },
                  ]}
                />
              </TableToolbar>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-xs uppercase text-slate-400 tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Detail</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {userPages.pageItems.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/20 transition">
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{u.name}</p>
                          <p className="text-[11px] text-slate-500">{u.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              roleBadgeClass[u.role] ?? ''
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {u.role === 'STUDENT' && (
                            <span>
                              Roll {u.rollNumber} · Sem {u.semester} · {u.departmentCode}
                            </span>
                          )}
                          {u.role === 'FACULTY' && (
                            <span>
                              {u.designation} · {u.departmentCode}
                            </span>
                          )}
                          {u.role === 'ADMIN' && <span>System Core</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setPasswordUser(u)}
                              title="Reset password"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={busy || u.id === session.userId}
                              onClick={() => handleDelete('delete_user', u.id, u.name)}
                              title={
                                u.id === session.userId
                                  ? 'You cannot delete your own account'
                                  : 'Delete user'
                              }
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition disabled:opacity-30 disabled:hover:text-slate-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {visibleUsers.length === 0 && (
                      <tr>
                        <td colSpan={4}>
                          <EmptyState
                            icon={Users}
                            title={data.users.length === 0 ? 'No accounts yet' : 'No matching accounts'}
                            hint={
                              data.users.length === 0
                                ? 'Use the form on the right to register the first account.'
                                : 'Try a different search term or role filter.'
                            }
                            onClear={
                              data.users.length === 0
                                ? undefined
                                : () => {
                                    setUserQuery('')
                                    setUserRole('ALL')
                                    userPages.resetPage()
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
                page={userPages.page}
                pageCount={userPages.pageCount}
                total={visibleUsers.length}
                pageSize={8}
                onChange={userPages.setPage}
                label="accounts"
              />
            </div>

            <div className={cardClass}>
              <h2 className="text-lg font-bold text-ink flex items-center gap-2 mb-4">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                Register User
              </h2>
              <form onSubmit={handleCreateUser} className="space-y-3">
                <div>
                  <label className={labelClass} htmlFor="user-name">
                    Full name
                  </label>
                  <input
                    id="user-name"
                    type="text"
                    required
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. Robert Vance"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="user-email">
                    Email
                  </label>
                  <input
                    id="user-email"
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className={inputClass}
                    placeholder="robert@university.edu"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="user-password">
                    Initial password
                  </label>
                  <input
                    id="user-password"
                    type="password"
                    required
                    minLength={6}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className={inputClass}
                    placeholder="At least 6 characters"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="user-role">
                    Role
                  </label>
                  <select
                    id="user-role"
                    value={userForm.role}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        role: e.target.value as 'ADMIN' | 'FACULTY' | 'STUDENT',
                      })
                    }
                    className={inputClass}
                  >
                    <option value="STUDENT">Student</option>
                    <option value="FACULTY">Faculty</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                {userForm.role !== 'ADMIN' && (
                  <div>
                    <label className={labelClass} htmlFor="user-department">
                      Department
                    </label>
                    <select
                      id="user-department"
                      required
                      value={userForm.departmentId}
                      onChange={(e) => setUserForm({ ...userForm, departmentId: e.target.value })}
                      className={inputClass}
                    >
                      <option value="" disabled>
                        Select a department
                      </option>
                      {data.departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {userForm.role === 'STUDENT' && (
                  <div>
                    <label className={labelClass} htmlFor="user-roll">
                      Roll number
                    </label>
                    <input
                      id="user-roll"
                      type="text"
                      required
                      value={userForm.rollNumber}
                      onChange={(e) => setUserForm({ ...userForm, rollNumber: e.target.value })}
                      className={inputClass}
                      placeholder="e.g. CS2026-045"
                    />
                  </div>
                )}

                {userForm.role === 'FACULTY' && (
                  <div>
                    <label className={labelClass} htmlFor="user-designation">
                      Designation
                    </label>
                    <input
                      id="user-designation"
                      type="text"
                      value={userForm.designation}
                      onChange={(e) => setUserForm({ ...userForm, designation: e.target.value })}
                      className={inputClass}
                      placeholder="e.g. Assistant Professor"
                    />
                  </div>
                )}

                <button type="submit" disabled={busy} className={primaryButton}>
                  {busy ? 'Working…' : 'Create User'}
                </button>
              </form>
            </div>
          </div>
        )}

        {tab === 'courses' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`lg:col-span-2 ${cardClass}`}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-ink">Course Catalog</h2>
                <span className="text-xs text-slate-500">
                  {visibleCourses.length} of {data.courses.length} courses
                </span>
              </div>
              <TableToolbar>
                <SearchField
                  value={courseQuery}
                  onChange={(value) => {
                    setCourseQuery(value)
                    coursePages.resetPage()
                  }}
                  placeholder="Search code, title, instructor…"
                  ariaLabel="Search courses"
                />
                <SelectFilter
                  value={courseDepartment}
                  onChange={(value) => {
                    setCourseDepartment(value)
                    coursePages.resetPage()
                  }}
                  ariaLabel="Filter courses by department"
                  options={[
                    { value: 'ALL', label: 'All departments' },
                    ...data.departments.map((d) => ({ value: d.id, label: d.code })),
                  ]}
                />
              </TableToolbar>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-xs uppercase text-slate-400 tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Cr.</th>
                      <th className="px-4 py-3">Dept</th>
                      <th className="px-4 py-3">Instructor</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {coursePages.pageItems.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/20 transition">
                        <td className="px-4 py-3 font-mono text-emerald-400 text-xs font-semibold">
                          {c.code}
                        </td>
                        <td className="px-4 py-3 font-medium text-ink">
                          {c.title}
                          <span className="block text-[11px] text-slate-500">
                            {c.enrollmentCount} enrolled
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{c.credits}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{c.departmentCode}</td>
                        <td className="px-4 py-3 text-xs text-purple-300">
                          {c.facultyName ?? 'Unassigned'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingCourse(c)}
                              title="Edit course"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleDelete('delete_course', c.id, `course ${c.code}`)}
                              title="Delete course"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition disabled:opacity-30"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {visibleCourses.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <EmptyState
                            icon={BookOpen}
                            title={data.courses.length === 0 ? 'No courses yet' : 'No matching courses'}
                            hint={
                              data.courses.length === 0
                                ? 'Add a course with the form on the right to get started.'
                                : 'Try a different search term or department.'
                            }
                            onClear={
                              data.courses.length === 0
                                ? undefined
                                : () => {
                                    setCourseQuery('')
                                    setCourseDepartment('ALL')
                                    coursePages.resetPage()
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
                page={coursePages.page}
                pageCount={coursePages.pageCount}
                total={visibleCourses.length}
                pageSize={8}
                onChange={coursePages.setPage}
                label="courses"
              />
            </div>

            <div className={cardClass}>
              <h2 className="text-lg font-bold text-ink flex items-center gap-2 mb-4">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                Add Course
              </h2>
              <form onSubmit={handleCreateCourse} className="space-y-3">
                <div>
                  <label className={labelClass} htmlFor="course-code">
                    Course code
                  </label>
                  <input
                    id="course-code"
                    type="text"
                    required
                    value={courseForm.code}
                    onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                    className={`${inputClass} uppercase`}
                    placeholder="e.g. CS-405"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="course-title">
                    Title
                  </label>
                  <input
                    id="course-title"
                    type="text"
                    required
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. Artificial Intelligence"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="course-credits">
                    Credits
                  </label>
                  <input
                    id="course-credits"
                    type="number"
                    min={1}
                    max={6}
                    value={courseForm.credits}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, credits: Number(e.target.value) || 3 })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="course-dept">
                    Department
                  </label>
                  <select
                    id="course-dept"
                    required
                    value={courseForm.departmentId}
                    onChange={(e) => setCourseForm({ ...courseForm, departmentId: e.target.value })}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      Select a department
                    </option>
                    {data.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="course-faculty">
                    Instructor
                  </label>
                  <select
                    id="course-faculty"
                    value={courseForm.facultyId}
                    onChange={(e) => setCourseForm({ ...courseForm, facultyId: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Unassigned</option>
                    {facultyUsers.map((f) => (
                      <option key={f.facultyProfileId ?? f.id} value={f.facultyProfileId ?? ''}>
                        {f.name} ({f.designation})
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" disabled={busy} className={primaryButton}>
                  {busy ? 'Working…' : 'Create Course'}
                </button>
              </form>
            </div>
          </div>
        )}

        {tab === 'departments' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`lg:col-span-2 ${cardClass}`}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-ink">Academic Departments</h2>
                <span className="text-xs text-slate-500">
                  {visibleDepartments.length} of {data.departments.length} departments
                </span>
              </div>
              <TableToolbar>
                <SearchField
                  value={departmentQuery}
                  onChange={(value) => {
                    setDepartmentQuery(value)
                    departmentPages.resetPage()
                  }}
                  placeholder="Search department name or code…"
                  ariaLabel="Search departments"
                />
              </TableToolbar>
              <div className="space-y-4">
                {departmentPages.pageItems.map((dept) => (
                  <div
                    key={dept.id}
                    className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                          {dept.code}
                        </span>
                        <h3 className="font-semibold text-ink text-base">{dept.name}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {dept.description ?? 'No description provided'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-2 text-center">
                        <CountChip label="Courses" value={dept.courseCount} tone="text-ink" />
                        <CountChip label="Students" value={dept.studentCount} tone="text-blue-400" />
                        <CountChip label="Faculty" value={dept.facultyCount} tone="text-purple-400" />
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingDepartment(dept)}
                          title="Edit department"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDelete('delete_department', dept.id, dept.name)}
                          title="Delete department"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {visibleDepartments.length === 0 && (
                  <EmptyState
                    icon={Building2}
                    title={data.departments.length === 0 ? 'No departments yet' : 'No matching departments'}
                    hint={
                      data.departments.length === 0
                        ? 'Create the first department with the form on the right.'
                        : 'Try a different name or code.'
                    }
                    onClear={
                      data.departments.length === 0
                        ? undefined
                        : () => {
                            setDepartmentQuery('')
                            departmentPages.resetPage()
                          }
                    }
                  />
                )}
              </div>
              <Pagination
                page={departmentPages.page}
                pageCount={departmentPages.pageCount}
                total={visibleDepartments.length}
                pageSize={6}
                onChange={departmentPages.setPage}
                label="departments"
              />
            </div>

            <div className={cardClass}>
              <h2 className="text-lg font-bold text-ink flex items-center gap-2 mb-4">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                Add Department
              </h2>
              <form onSubmit={handleCreateDepartment} className="space-y-3">
                <div>
                  <label className={labelClass} htmlFor="dept-name">
                    Name
                  </label>
                  <input
                    id="dept-name"
                    type="text"
                    required
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. Mechanical Engineering"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="dept-code">
                    Code
                  </label>
                  <input
                    id="dept-code"
                    type="text"
                    required
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                    className={`${inputClass} uppercase`}
                    placeholder="e.g. ME"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="dept-description">
                    Description
                  </label>
                  <textarea
                    id="dept-description"
                    rows={3}
                    value={deptForm.description}
                    onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                    className={inputClass}
                    placeholder="Short overview of the department"
                  />
                </div>
                <button type="submit" disabled={busy} className={primaryButton}>
                  {busy ? 'Working…' : 'Save Department'}
                </button>
              </form>
            </div>
          </div>
        )}

        {tab === 'enrollments' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`lg:col-span-2 ${cardClass}`}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-ink">Course Enrollments</h2>
                <span className="text-xs text-slate-500">
                  {visibleEnrollments.length} of {data.enrollments.length} enrollments
                </span>
              </div>
              <TableToolbar>
                <SearchField
                  value={enrollmentQuery}
                  onChange={(value) => {
                    setEnrollmentQuery(value)
                    enrollmentPages.resetPage()
                  }}
                  placeholder="Search student, roll number, course…"
                  ariaLabel="Search enrollments"
                />
                <SelectFilter
                  value={enrollmentCourse}
                  onChange={(value) => {
                    setEnrollmentCourse(value)
                    enrollmentPages.resetPage()
                  }}
                  ariaLabel="Filter enrollments by course"
                  options={[
                    { value: 'ALL', label: 'All courses' },
                    ...data.courses.map((c) => ({ value: c.id, label: `${c.code} · ${c.title}` })),
                  ]}
                />
              </TableToolbar>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-xs uppercase text-slate-400 tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Roll No</th>
                      <th className="px-4 py-3">Course</th>
                      <th className="px-4 py-3">Grade</th>
                      <th className="px-4 py-3">Marks</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {enrollmentPages.pageItems.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-800/20 transition">
                        <td className="px-4 py-3 font-medium text-ink">{row.studentName}</td>
                        <td className="px-4 py-3 font-mono text-xs text-blue-300">
                          {row.rollNumber}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-300">
                          <span className="font-mono text-emerald-400">{row.courseCode}</span> ·{' '}
                          {row.courseTitle}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{row.grade ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-300">
                          {row.marks === null ? '—' : `${row.marks}%`}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                handleDelete(
                                  'delete_enrollment',
                                  row.id,
                                  `${row.studentName}'s enrollment in ${row.courseCode}`,
                                )
                              }
                              title="Remove enrollment"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition disabled:opacity-30"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {visibleEnrollments.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <EmptyState
                            icon={ClipboardList}
                            title={data.enrollments.length === 0 ? 'No enrollments yet' : 'No matching enrollments'}
                            hint={
                              data.enrollments.length === 0
                                ? 'Use the form on the right to enroll a student in a course.'
                                : 'Try a different search term or course filter.'
                            }
                            onClear={
                              data.enrollments.length === 0
                                ? undefined
                                : () => {
                                    setEnrollmentQuery('')
                                    setEnrollmentCourse('ALL')
                                    enrollmentPages.resetPage()
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
                page={enrollmentPages.page}
                pageCount={enrollmentPages.pageCount}
                total={visibleEnrollments.length}
                pageSize={8}
                onChange={enrollmentPages.setPage}
                label="enrollments"
              />
            </div>

            <div className={cardClass}>
              <h2 className="text-lg font-bold text-ink flex items-center gap-2 mb-4">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                Enroll Student
              </h2>
              <form onSubmit={handleCreateEnrollment} className="space-y-3">
                <div>
                  <label className={labelClass} htmlFor="enroll-student">
                    Student
                  </label>
                  <select
                    id="enroll-student"
                    required
                    value={enrollForm.studentId}
                    onChange={(e) => setEnrollForm({ ...enrollForm, studentId: e.target.value })}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      Select a student
                    </option>
                    {students.map((s) => (
                      <option key={s.studentProfileId ?? s.id} value={s.studentProfileId ?? ''}>
                        {s.name} · {s.rollNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="enroll-course">
                    Course
                  </label>
                  <select
                    id="enroll-course"
                    required
                    value={enrollForm.courseId}
                    onChange={(e) => setEnrollForm({ ...enrollForm, courseId: e.target.value })}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      Select a course
                    </option>
                    {data.courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} · {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={busy || students.length === 0 || data.courses.length === 0}
                  className={primaryButton}
                >
                  {busy ? 'Working…' : 'Enroll'}
                </button>
                {(students.length === 0 || data.courses.length === 0) && (
                  <p className="text-[11px] text-amber-400/80">
                    Add at least one student and one course before enrolling.
                  </p>
                )}
              </form>
            </div>
          </div>
        )}

        {tab === 'announcements' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`lg:col-span-2 ${cardClass}`}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-ink">Published Announcements</h2>
                <span className="text-xs text-slate-500">
                  {visibleAnnouncements.length} of {data.announcements.length} notices
                </span>
              </div>
              <TableToolbar>
                <SearchField
                  value={announcementQuery}
                  onChange={(value) => {
                    setAnnouncementQuery(value)
                    announcementPages.resetPage()
                  }}
                  placeholder="Search notices…"
                  ariaLabel="Search announcements"
                />
                <SelectFilter
                  value={announcementTarget}
                  onChange={(value) => {
                    setAnnouncementTarget(value)
                    announcementPages.resetPage()
                  }}
                  ariaLabel="Filter announcements by audience"
                  options={[
                    { value: 'EVERYONE', label: 'All audiences' },
                    { value: 'ALL', label: 'Entire campus' },
                    { value: 'STUDENT', label: 'Students' },
                    { value: 'FACULTY', label: 'Faculty' },
                  ]}
                />
              </TableToolbar>
              <div className="space-y-4">
                {announcementPages.pageItems.map((ann) => (
                  <AnnouncementCard
                    key={ann.id}
                    announcement={ann}
                    onDelete={() =>
                      handleDelete('delete_announcement', ann.id, `announcement "${ann.title}"`)
                    }
                    busy={busy}
                  />
                ))}
                {visibleAnnouncements.length === 0 && (
                  <EmptyState
                    icon={Bell}
                    title={data.announcements.length === 0 ? 'No announcements yet' : 'No matching notices'}
                    hint={
                      data.announcements.length === 0
                        ? 'Publish a notice with the form on the right.'
                        : 'Try a different search term or audience.'
                    }
                    onClear={
                      data.announcements.length === 0
                        ? undefined
                        : () => {
                            setAnnouncementQuery('')
                            setAnnouncementTarget('EVERYONE')
                            announcementPages.resetPage()
                          }
                    }
                  />
                )}
              </div>
              <Pagination
                page={announcementPages.page}
                pageCount={announcementPages.pageCount}
                total={visibleAnnouncements.length}
                pageSize={5}
                onChange={announcementPages.setPage}
                label="notices"
              />
            </div>

            <div className={cardClass}>
              <h2 className="text-lg font-bold text-ink flex items-center gap-2 mb-4">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                Publish Notice
              </h2>
              <form onSubmit={handleCreateAnnouncement} className="space-y-3">
                <div>
                  <label className={labelClass} htmlFor="ann-title">
                    Title
                  </label>
                  <input
                    id="ann-title"
                    type="text"
                    required
                    value={annForm.title}
                    onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. Library closure on Friday"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="ann-target">
                    Audience
                  </label>
                  <select
                    id="ann-target"
                    value={annForm.target}
                    onChange={(e) => setAnnForm({ ...annForm, target: e.target.value })}
                    className={inputClass}
                  >
                    <option value="ALL">Entire campus</option>
                    <option value="STUDENT">Students only</option>
                    <option value="FACULTY">Faculty only</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="ann-content">
                    Body
                  </label>
                  <textarea
                    id="ann-content"
                    rows={4}
                    required
                    value={annForm.content}
                    onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })}
                    className={inputClass}
                    placeholder="Detailed notification text"
                  />
                </div>
                <button type="submit" disabled={busy} className={primaryButton}>
                  {busy ? 'Working…' : 'Publish Notice'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {editingCourse && (
        <CourseEditModal
          course={editingCourse}
          departments={data.departments}
          faculty={facultyUsers}
          busy={busy}
          onClose={() => setEditingCourse(null)}
          onSave={async (payload) => {
            const saved = await run('update_course', { id: editingCourse.id, ...payload }, 'Course updated.')
            if (saved) setEditingCourse(null)
          }}
        />
      )}

      {editingDepartment && (
        <DepartmentEditModal
          department={editingDepartment}
          busy={busy}
          onClose={() => setEditingDepartment(null)}
          onSave={async (payload) => {
            const saved = await run(
              'update_department',
              { id: editingDepartment.id, ...payload },
              'Department updated.',
            )
            if (saved) setEditingDepartment(null)
          }}
        />
      )}

      {passwordUser && (
        <ResetPasswordModal
          user={passwordUser}
          busy={busy}
          onClose={() => setPasswordUser(null)}
          onSave={async (password) => {
            const saved = await run(
              'reset_password',
              { id: passwordUser.id, password },
              `Password updated for ${passwordUser.name}.`,
            )
            if (saved) setPasswordUser(null)
          }}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <h3 className={`text-2xl font-bold mt-1 ${tone}`}>{value}</h3>
    </div>
  )
}

function CountChip({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="px-3 py-1 bg-slate-900 rounded-lg border border-slate-800 text-center">
      <span className="text-[10px] text-slate-400 uppercase">{label}</span>
      <p className={`text-sm font-bold ${tone}`}>{value}</p>
    </div>
  )
}

function AnnouncementCard({
  announcement,
  onDelete,
  busy,
}: {
  announcement: AnnouncementRow
  onDelete: () => void
  busy: boolean
}) {
  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-1">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded">
          {announcement.target}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {new Date(announcement.createdAt).toLocaleDateString()}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            title="Delete announcement"
            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition disabled:opacity-30"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <h3 className="font-semibold text-ink text-base mt-2">{announcement.title}</h3>
      <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">
        {announcement.content}
      </p>
      <p className="text-[11px] text-slate-500 pt-1">Posted by {announcement.authorName}</p>
    </div>
  )
}

interface CoursePayload {
  code: string
  title: string
  credits: number
  departmentId: string
  facultyId: string
}

function CourseEditModal({
  course,
  departments,
  faculty,
  busy,
  onClose,
  onSave,
}: {
  course: CourseRow
  departments: DepartmentRow[]
  faculty: UserRow[]
  busy: boolean
  onClose: () => void
  onSave: (payload: CoursePayload) => void
}) {
  const [form, setForm] = useState<CoursePayload>({
    code: course.code,
    title: course.title,
    credits: course.credits,
    departmentId: course.departmentId,
    facultyId: course.facultyProfileId ?? '',
  })

  return (
    <Modal title={`Edit ${course.code}`} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSave(form)
        }}
        className="space-y-3"
      >
        <div>
          <label className={labelClass} htmlFor="edit-course-code">
            Course code
          </label>
          <input
            id="edit-course-code"
            type="text"
            required
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            className={`${inputClass} uppercase`}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="edit-course-title">
            Title
          </label>
          <input
            id="edit-course-title"
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="edit-course-credits">
            Credits
          </label>
          <input
            id="edit-course-credits"
            type="number"
            min={1}
            max={6}
            value={form.credits}
            onChange={(e) => setForm({ ...form, credits: Number(e.target.value) || 3 })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="edit-course-dept">
            Department
          </label>
          <select
            id="edit-course-dept"
            value={form.departmentId}
            onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
            className={inputClass}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="edit-course-faculty">
            Instructor
          </label>
          <select
            id="edit-course-faculty"
            value={form.facultyId}
            onChange={(e) => setForm({ ...form, facultyId: e.target.value })}
            className={inputClass}
          >
            <option value="">Unassigned</option>
            {faculty.map((f) => (
              <option key={f.facultyProfileId ?? f.id} value={f.facultyProfileId ?? ''}>
                {f.name} ({f.designation})
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2.5 rounded-xl transition text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-paper font-medium py-2.5 rounded-xl transition text-sm"
          >
            {busy ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

interface DepartmentPayload {
  name: string
  code: string
  description: string
}

function DepartmentEditModal({
  department,
  busy,
  onClose,
  onSave,
}: {
  department: DepartmentRow
  busy: boolean
  onClose: () => void
  onSave: (payload: DepartmentPayload) => void
}) {
  const [form, setForm] = useState<DepartmentPayload>({
    name: department.name,
    code: department.code,
    description: department.description ?? '',
  })

  return (
    <Modal title={`Edit ${department.code}`} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSave(form)
        }}
        className="space-y-3"
      >
        <div>
          <label className={labelClass} htmlFor="edit-dept-name">
            Name
          </label>
          <input
            id="edit-dept-name"
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="edit-dept-code">
            Code
          </label>
          <input
            id="edit-dept-code"
            type="text"
            required
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            className={`${inputClass} uppercase`}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="edit-dept-description">
            Description
          </label>
          <textarea
            id="edit-dept-description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2.5 rounded-xl transition text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-paper font-medium py-2.5 rounded-xl transition text-sm"
          >
            {busy ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ResetPasswordModal({
  user,
  busy,
  onClose,
  onSave,
}: {
  user: UserRow
  busy: boolean
  onClose: () => void
  onSave: (password: string) => void
}) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const mismatch = confirm.length > 0 && password !== confirm

  return (
    <Modal title={`Reset password for ${user.name}`} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (!mismatch) onSave(password)
        }}
        className="space-y-3"
      >
        <div>
          <label className={labelClass} htmlFor="reset-password">
            New password
          </label>
          <input
            id="reset-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="At least 6 characters"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="reset-password-confirm">
            Confirm password
          </label>
          <input
            id="reset-password-confirm"
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
        </div>
        {mismatch && <p className="text-xs text-rose-400">Passwords do not match.</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2.5 rounded-xl transition text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || mismatch || password.length < 6}
            className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-paper font-medium py-2.5 rounded-xl transition text-sm"
          >
            {busy ? 'Saving…' : 'Reset Password'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
