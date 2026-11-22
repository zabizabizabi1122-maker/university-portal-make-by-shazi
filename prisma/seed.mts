import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

// The seed script wipes every table before inserting demo data. Never allow it
// to touch a production database.
if (process.env.NODE_ENV === 'production') {
  console.error(
    'Refusing to seed: NODE_ENV=production. This script deletes all existing data.',
  )
  process.exit(1)
}

const prisma = new PrismaClient()

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

/** UTC midnight of the local calendar day `daysAgo` days before today. */
function dayOffset(daysAgo: number): Date {
  const now = new Date()
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo)
  return new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()))
}

async function main() {
  console.log('Seeding University Portal Database...')

  // Clean existing data
  await prisma.attendance.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.course.deleteMany()
  await prisma.announcement.deleteMany()
  await prisma.studentProfile.deleteMany()
  await prisma.facultyProfile.deleteMany()
  await prisma.user.deleteMany()
  await prisma.department.deleteMany()

  // 1. Create Departments
  const csDept = await prisma.department.create({
    data: {
      name: 'Computer Science & Engineering',
      code: 'CSE',
      description: 'Department of Computer Science and Engineering',
    },
  })

  await prisma.department.create({
    data: {
      name: 'Electrical Engineering',
      code: 'EE',
      description: 'Department of Electrical Engineering',
    },
  })

  await prisma.department.create({
    data: {
      name: 'School of Business & Management',
      code: 'SBM',
      description: 'Business Administration and Management',
    },
  })

  const defaultPassword = hashPassword('password123')

  // 2. Create Admin User
  const admin = await prisma.user.create({
    data: {
      email: 'admin@university.edu',
      name: 'System Administrator',
      password: defaultPassword,
      role: 'ADMIN',
    },
  })

  // 3. Create Faculty User
  const facultyUser = await prisma.user.create({
    data: {
      email: 'prof.smith@university.edu',
      name: 'Dr. Alan Smith',
      password: defaultPassword,
      role: 'FACULTY',
      facultyProfile: {
        create: {
          designation: 'Associate Professor',
          departmentId: csDept.id,
        },
      },
    },
    include: { facultyProfile: true },
  })

  // 4. Create Student User 1
  const studentUser1 = await prisma.user.create({
    data: {
      email: 'john.doe@student.university.edu',
      name: 'John Doe',
      password: defaultPassword,
      role: 'STUDENT',
      studentProfile: {
        create: {
          rollNumber: 'CS2026-001',
          departmentId: csDept.id,
          semester: 4,
          cgpa: 3.82,
        },
      },
    },
    include: { studentProfile: true },
  })

  // 5. Create Student User 2
  const studentUser2 = await prisma.user.create({
    data: {
      email: 'sarah.connor@student.university.edu',
      name: 'Sarah Connor',
      password: defaultPassword,
      role: 'STUDENT',
      studentProfile: {
        create: {
          rollNumber: 'CS2026-002',
          departmentId: csDept.id,
          semester: 4,
          cgpa: 3.91,
        },
      },
    },
    include: { studentProfile: true },
  })

  // 6. Create Courses
  const course1 = await prisma.course.create({
    data: {
      code: 'CS-301',
      title: 'Database Management Systems',
      credits: 4,
      departmentId: csDept.id,
      facultyId: facultyUser.facultyProfile?.id,
    },
  })

  const course2 = await prisma.course.create({
    data: {
      code: 'CS-304',
      title: 'Web Technologies & Cloud Computing',
      credits: 3,
      departmentId: csDept.id,
      facultyId: facultyUser.facultyProfile?.id,
    },
  })

  const course3 = await prisma.course.create({
    data: {
      code: 'CS-202',
      title: 'Data Structures and Algorithms',
      credits: 4,
      departmentId: csDept.id,
      facultyId: facultyUser.facultyProfile?.id,
    },
  })

  // 7. Enroll Students
  if (studentUser1.studentProfile) {
    await prisma.enrollment.createMany({
      data: [
        {
          studentId: studentUser1.studentProfile.id,
          courseId: course1.id,
          grade: 'A',
          marks: 92.0,
        },
        {
          studentId: studentUser1.studentProfile.id,
          courseId: course2.id,
          grade: 'A-',
          marks: 87.5,
        },
      ],
    })

    // Add Attendance sample records. Dates are stored as calendar days
    // (UTC midnight) so a student can only have one record per course per day.
    for (let i = 1; i <= 5; i++) {
      await prisma.attendance.create({
        data: {
          studentId: studentUser1.studentProfile.id,
          courseId: course1.id,
          date: dayOffset(i),
          status: i === 3 ? 'ABSENT' : 'PRESENT',
        },
      })
    }
  }

  if (studentUser2.studentProfile) {
    await prisma.enrollment.createMany({
      data: [
        {
          studentId: studentUser2.studentProfile.id,
          courseId: course1.id,
          grade: 'A+',
          marks: 97.0,
        },
        {
          studentId: studentUser2.studentProfile.id,
          courseId: course3.id,
          grade: 'A',
          marks: 94.0,
        },
      ],
    })
  }

  // 8. Add Announcements
  await prisma.announcement.createMany({
    data: [
      {
        title: 'Fall Semester Midterm Examination Schedule',
        content: 'Midterm examinations will commence on the 15th of next month. Check your departmental portal for the detailed timetable.',
        target: 'ALL',
        authorId: admin.id,
      },
      {
        title: 'Campus Hackathon 2026 Registration Open',
        content: 'Register your teams of up to 4 members before the end of the week for the annual campus-wide hackathon.',
        target: 'STUDENT',
        authorId: admin.id,
      },
    ],
  })

  console.log('Seeding finished successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
