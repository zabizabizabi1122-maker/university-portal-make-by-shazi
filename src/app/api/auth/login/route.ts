import { NextResponse } from 'next/server'
import { verifyPassword, needsRehash, hashPassword } from '@/lib/crypto'
import { createToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json()) as { email?: unknown; password?: unknown }

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    })

    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Upgrade seeded legacy SHA-256 hashes to scrypt on first successful login.
    if (needsRehash(user.password)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashPassword(password) },
      })
    }

    const token = await createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
