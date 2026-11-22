import { NextResponse } from 'next/server'
import { z } from 'zod'
import { hashPassword } from '@/lib/crypto'
import { getServerSupabase } from '@/lib/supabase-server'

const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(120),
  email: z.string().trim().email('Enter a valid email address').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['FACULTY', 'STUDENT'], {
    error: 'Select a role: Faculty or Student',
  }),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = registerSchema.safeParse(body)

    if (!result.success) {
      const message = result.error.issues[0]?.message ?? 'Invalid input'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const { fullName, email, password, role } = result.data
    const supabase = getServerSupabase()

    // Check if email already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Create the user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        email: email.toLowerCase(),
        password: hashPassword(password),
        full_name: fullName,
        role,
      })
      .select('id, email, full_name, role')
      .single()

    if (error) {
      console.error('Registration error:', error)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        role: profile.role,
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
