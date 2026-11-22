import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

async function main() {
  console.log('Seeding Comprehensive University Portal Data...')

  // 1. Academic Session
  const session = await prisma.academicSession.upsert({
    where: { name: 'Fall 2026' },
    update: { isCurrent: true },
    create: {
      name: 'Fall 2026',
      isCurrent: true,
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-01-30'),
    },
  })

  // 2. Departments
  const cseDept = await prisma.department.upsert({
    where: { code: 'CSE' },
    update: {},
    create: {
      name: 'Computer Science & Engineering',
      code: 'CSE',
      description: 'Department of Computing, AI and Software Engineering',
    },
  })

  const eeDept = await prisma.department.upsert({
    where: { code: 'EE' },
    update: {},
    create: {
      name: 'Electrical Engineering',
      code: 'EE',
      description: 'Department of Electrical & Electronics Engineering',
    },
  })

  const bbaDept = await prisma.department.upsert({
    where: { code: 'BBA' },
    update: {},
    create: {
      name: 'Business Administration',
      code: 'BBA',
      description: 'School of Management & Business Studies',
    },
  })

  // 3. Admin Account
  const defaultPassword = hashPassword('password123')

  const admin = await prisma.user.upsert({
    where: { email: 'admin@university.edu' },
    update: {},
    create: {
      email: 'admin@university.edu',
      name: 'System Administrator',
      password: defaultPassword,
      role: 'ADMIN',
      phone: '+1 800-555-0199',
    },
  })

  // 4. Faculty Accounts
  const facultyUser1 = await prisma.user.upsert({
    where: { email: 'prof.smith@university.edu' },
    update: {},
    create: {
      email: 'prof.smith@university.edu',
      name: 'Dr. Alan Smith',
      password: defaultPassword,
      role: 'FACULTY',
      phone: '+1 555-0144',
      facultyProfile: {
        create: {
          designation: 'Associate Professor',
          departmentId: cseDept.id,
        },
      },
    },
    include: { facultyProfile: true },
  })

  const facultyUser2 = await prisma.user.upsert({
    where: { email: 'dr.johnson@university.edu' },
    update: {},
    create: {
      email: 'dr.johnson@university.edu',
      name: 'Dr. Emily Johnson',
      password: defaultPassword,
      role: 'FACULTY',
      phone: '+1 555-0177',
      facultyProfile: {
        create: {
          designation: 'Professor & Dean',
          departmentId: cseDept.id,
        },
      },
    },
    include: { facultyProfile: true },
  })

  // 5. Student Accounts
  const studentUser1 = await prisma.user.upsert({
    where: { email: 'john.doe@student.university.edu' },
    update: {},
    create: {
      email: 'john.doe@student.university.edu',
      name: 'John Doe',
      password: defaultPassword,
      role: 'STUDENT',
      phone: '+1 555-0122',
      studentProfile: {
        create: {
          rollNumber: 'CS2026-001',
          departmentId: cseDept.id,
          semester: 4,
          cgpa: 3.82,
        },
      },
    },
    include: { studentProfile: true },
  })

  const studentUser2 = await prisma.user.upsert({
    where: { email: 'sarah.connor@student.university.edu' },
    update: {},
    create: {
      email: 'sarah.connor@student.university.edu',
      name: 'Sarah Connor',
      password: defaultPassword,
      role: 'STUDENT',
      phone: '+1 555-0188',
      studentProfile: {
        create: {
          rollNumber: 'CS2026-002',
          departmentId: cseDept.id,
          semester: 4,
          cgpa: 3.94,
        },
      },
    },
    include: { studentProfile: true },
  })

  // 6. Courses
  const c1 = await prisma.course.upsert({
    where: { code: 'CS-301' },
    update: { facultyId: facultyUser1.facultyProfile?.id },
    create: {
      code: 'CS-301',
      title: 'Database Management Systems',
      credits: 4,
      departmentId: cseDept.id,
      facultyId: facultyUser1.facultyProfile?.id,
    },
  })

  const c2 = await prisma.course.upsert({
    where: { code: 'CS-304' },
    update: { facultyId: facultyUser1.facultyProfile?.id },
    create: {
      code: 'CS-304',
      title: 'Web Technologies & Cloud Computing',
      credits: 3,
      departmentId: cseDept.id,
      facultyId: facultyUser1.facultyProfile?.id,
    },
  })

  const c3 = await prisma.course.upsert({
    where: { code: 'CS-202' },
    update: { facultyId: facultyUser2.facultyProfile?.id },
    create: {
      code: 'CS-202',
      title: 'Data Structures and Algorithms',
      credits: 4,
      departmentId: cseDept.id,
      facultyId: facultyUser2.facultyProfile?.id,
    },
  })

  const c4 = await prisma.course.upsert({
    where: { code: 'CS-405' },
    update: { facultyId: facultyUser2.facultyProfile?.id },
    create: {
      code: 'CS-405',
      title: 'Artificial Intelligence & Machine Learning',
      credits: 3,
      departmentId: cseDept.id,
      facultyId: facultyUser2.facultyProfile?.id,
    },
  })

  // 7. Enrollments
  if (studentUser1.studentProfile) {
    await prisma.enrollment.upsert({
      where: {
        studentId_courseId: {
          studentId: studentUser1.studentProfile.id,
          courseId: c1.id,
        },
      },
      update: {},
      create: {
        studentId: studentUser1.studentProfile.id,
        courseId: c1.id,
        grade: 'A',
        marks: 92.5,
      },
    })

    await prisma.enrollment.upsert({
      where: {
        studentId_courseId: {
          studentId: studentUser1.studentProfile.id,
          courseId: c2.id,
        },
      },
      update: {},
      create: {
        studentId: studentUser1.studentProfile.id,
        courseId: c2.id,
        grade: 'A-',
        marks: 88.0,
      },
    })
  }

  // 8. Timetable
  const existingTimetables = await prisma.timetable.count()
  if (existingTimetables === 0) {
    await prisma.timetable.createMany({
      data: [
        {
          courseId: c1.id,
          facultyId: facultyUser1.facultyProfile?.id,
          sessionId: session.id,
          dayOfWeek: 'Monday',
          startTime: '09:00 AM',
          endTime: '10:30 AM',
          room: 'Lab CS-201',
        },
        {
          courseId: c2.id,
          facultyId: facultyUser1.facultyProfile?.id,
          sessionId: session.id,
          dayOfWeek: 'Wednesday',
          startTime: '11:00 AM',
          endTime: '12:30 PM',
          room: 'Hall 3B',
        },
        {
          courseId: c3.id,
          facultyId: facultyUser2.facultyProfile?.id,
          sessionId: session.id,
          dayOfWeek: 'Friday',
          startTime: '02:00 PM',
          endTime: '03:30 PM',
          room: 'Seminar Room 1',
        },
      ],
    })
  }

  // 9. Assignments
  const existingAssignments = await prisma.assignment.count()
  if (existingAssignments === 0) {
    const a1 = await prisma.assignment.create({
      data: {
        courseId: c1.id,
        title: 'Project 1: Relational Schema & Normalization',
        description: 'Design 3NF schema for an e-commerce platform with ER diagram and SQL scripts.',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxMarks: 100,
      },
    })

    const a2 = await prisma.assignment.create({
      data: {
        courseId: c2.id,
        title: 'Lab 3: REST API Authentication with JWT',
        description: 'Implement JWT authentication with refresh token rotation and role middleware in Next.js.',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        maxMarks: 50,
      },
    })

    if (studentUser1.studentProfile) {
      await prisma.submission.create({
        data: {
          assignmentId: a1.id,
          studentId: studentUser1.studentProfile.id,
          content: 'Completed normalization up to BCNF with verified SQL migrations.',
          status: 'GRADED',
          marks: 96,
          feedback: 'Excellent schema design and indexing strategy.',
        },
      })
    }
  }

  // 10. Fee Invoices
  if (studentUser1.studentProfile) {
    const feeCount = await prisma.feeInvoice.count({
      where: { studentId: studentUser1.studentProfile.id },
    })
    if (feeCount === 0) {
      await prisma.feeInvoice.createMany({
        data: [
          {
            studentId: studentUser1.studentProfile.id,
            sessionId: session.id,
            title: 'Fall 2026 Semester Tuition & Lab Fee',
            amount: 2450.0,
            dueDate: new Date('2026-10-15'),
            status: 'PAID',
            paidAt: new Date('2026-10-10'),
          },
          {
            studentId: studentUser1.studentProfile.id,
            sessionId: session.id,
            title: 'Spring 2027 Registration Advance',
            amount: 750.0,
            dueDate: new Date('2027-01-20'),
            status: 'PENDING',
          },
        ],
      })
    }
  }

  console.log('Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
