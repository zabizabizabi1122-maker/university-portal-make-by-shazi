import { NextResponse } from 'next/server'
import { verifyOtp } from '@/lib/crypto'
import { verifyOtpPendingToken } from '@/lib/jwt'
import { createToken } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const { otpToken, code } = (await req.json()) as { otpToken?: string; code?: string }

    if (!otpToken || !code) {
      return NextResponse.json({ error: 'OTP token and code are required' }, { status: 400 })
    }

    // Validate the code format
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Enter a 6-digit verification code' }, { status: 400 })
    }

    // Verify the OTP-pending token
    const pending = await verifyOtpPendingToken(otpToken)
    if (!pending) {
      return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 })
    }

    const supabase = getServerSupabase()

    // Find the latest unused OTP for this user
    const { data: otpRecord, error: otpFindError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('user_id', pending.userId)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (otpFindError || !otpRecord) {
      return NextResponse.json({ error: 'No active verification code. Please log in again.' }, { status: 400 })
    }

    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabase.from('otp_codes').update({ used: true }).eq('id', otpRecord.id)
      return NextResponse.json({ error: 'Verification code has expired. Please log in again.' }, { status: 400 })
    }

    // Check max attempts (5)
    if (otpRecord.attempts >= 5) {
      await supabase.from('otp_codes').update({ used: true }).eq('id', otpRecord.id)
      return NextResponse.json(
        { error: 'Too many incorrect attempts. Please log in again.' },
        { status: 429 }
      )
    }

    // Increment attempts
    await supabase
      .from('otp_codes')
      .update({ attempts: otpRecord.attempts + 1 })
      .eq('id', otpRecord.id)

    // Verify the OTP code
    if (!verifyOtp(code, otpRecord.code_hash)) {
      const remaining = 4 - otpRecord.attempts
      if (remaining <= 0) {
        // 5th incorrect attempt → invalidate
        await supabase.from('otp_codes').update({ used: true }).eq('id', otpRecord.id)
        return NextResponse.json(
          { error: 'Too many incorrect attempts. Please log in again.' },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` },
        { status: 400 }
      )
    }

    // OTP verified — mark as used
    await supabase.from('otp_codes').update({ used: true }).eq('id', otpRecord.id)

    // Create a full session token
    const sessionToken = await createToken({
      userId: pending.userId,
      email: pending.email,
      name: pending.name,
      role: pending.role,
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: pending.userId,
        email: pending.email,
        name: pending.name,
        role: pending.role,
      },
    })

    response.cookies.set('auth_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    console.error('OTP verification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
