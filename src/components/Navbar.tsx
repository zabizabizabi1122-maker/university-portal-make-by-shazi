'use client'

import { useRouter } from 'next/navigation'
import { GraduationCap, LogOut } from 'lucide-react'

interface NavbarProps {
  user: {
    name: string
    email: string
    role: string
  }
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const roleBadgeColor: Record<string, string> = {
    ADMIN: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    FACULTY: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    STUDENT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }

  return (
    <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl text-paper shadow-md shadow-blue-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-ink text-base">UniPortal</span>
            <span className="text-xs text-slate-400 ml-2 border-l border-slate-700 pl-2">
              Academic Hub
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-ink leading-none">{user.name}</p>
              <p className="text-xs text-slate-400 mt-1">{user.email}</p>
            </div>
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                roleBadgeColor[user.role] || ''
              }`}
            >
              {user.role}
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="Log out"
            className="p-2 rounded-xl text-slate-400 hover:text-ink hover:bg-slate-800 border border-transparent hover:border-slate-700 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
