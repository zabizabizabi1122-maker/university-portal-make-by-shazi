'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to login')
      }

      const role = data.user.role
      if (role === 'ADMIN') router.push('/admin')
      else if (role === 'FACULTY') router.push('/faculty')
      else router.push('/student')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-0" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl shadow-xl shadow-blue-500/20 mb-4 border border-blue-400/30">
            <GraduationCap className="w-9 h-9 text-paper" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink flex items-center justify-center gap-2">
            University Portal
            <Sparkles className="w-5 h-5 text-amber-400 inline" />
          </h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">
            Academic Management & Student Information System
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-7 shadow-2xl shadow-black/50">
          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Official Email
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-11 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-ink placeholder-slate-500 transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-11 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-ink placeholder-slate-500 transition-all duration-200"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-paper font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          © 2026 Academic Portal System. All rights reserved.
        </p>
      </div>
    </div>
  )
}
