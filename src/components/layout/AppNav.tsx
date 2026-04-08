'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Wallet, ChevronDown, LogOut, Settings, Plus, User, Sun, Moon, Sparkles } from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { createSharedAccount } from '@/app/actions/accounts'
import { useTheme } from 'next-themes'
import MonthNav from '@/components/budget/MonthNav'
import PDFDownloadButton from '@/components/budget/PDFDownloadButton'

interface Account {
  id: string
  name: string
  type: string
}

interface AppNavProps {
  accounts: Account[]
  userEmail: string
}

export default function AppNav({ accounts, userEmail }: AppNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [creatingAccount, setCreatingAccount] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])

  // Parse current route: /{accountId}/{year}/{month}
  const pathParts = pathname.split('/').filter(Boolean)
  const currentAccountId = pathParts[0] ?? accounts[0]?.id
  const currentAccount = accounts.find((a) => a.id === currentAccountId) ?? accounts[0]
  const routeYear = pathParts[1] ? parseInt(pathParts[1]) : null
  const routeMonth = pathParts[2] ? parseInt(pathParts[2]) : null
  const isMonthPage = !!routeYear && !!routeMonth && !isNaN(routeYear) && !isNaN(routeMonth)

  function switchAccount(accountId: string) {
    setShowAccountMenu(false)
    const now = new Date()
    router.push(`/${accountId}/${now.getFullYear()}/${now.getMonth() + 1}`)
  }

  async function handleCreateShared() {
    const name = prompt('שם לחשבון המשותף? (למשל: "איתי ומיה")')
    if (!name) return
    setCreatingAccount(true)
    const formData = new FormData()
    formData.set('name', name)
    const result = await createSharedAccount(formData)
    setCreatingAccount(false)
    if (result?.accountId) {
      const now = new Date()
      router.push(`/${result.accountId}/${now.getFullYear()}/${now.getMonth() + 1}`)
      router.refresh()
    }
  }

  return (
    <header className="bg-white dark:bg-card border-b border-slate-200 dark:border-white/[0.08] sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4">

        {/* ── Single row: logo+account | center | icons ── */}
        <div className="flex items-center justify-between h-14 md:h-16 gap-2">

        {/* Right: Logo + account switcher */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="bg-indigo-100 dark:bg-indigo-900/60 rounded-lg p-1.5">
              <Wallet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white tracking-tight hidden sm:inline">תקציב-לי</span>
          </Link>

          {/* Account switcher */}
          <div className="relative">
            <button
              onClick={() => { setShowAccountMenu(!showAccountMenu); setShowUserMenu(false) }}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/[0.07] hover:bg-slate-200 dark:hover:bg-white/[0.12] rounded-lg px-3 py-1.5 transition-colors"
            >
              <span className="max-w-[100px] truncate">{currentAccount?.name ?? 'בחר חשבון'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showAccountMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowAccountMenu(false)} />
                <div className="absolute start-0 top-full mt-1 bg-white dark:bg-card border border-slate-200 dark:border-white/[0.1] rounded-xl shadow-lg z-20 min-w-[200px] py-1 overflow-hidden">
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => switchAccount(account.id)}
                      className={`w-full text-right px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-white/[0.05] flex items-center gap-2 ${
                        account.id === currentAccountId ? 'text-indigo-600 font-medium bg-indigo-50 dark:bg-indigo-950/40' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${account.type === 'shared' ? 'bg-violet-400' : 'bg-indigo-400'}`} />
                      {account.name}
                    </button>
                  ))}
                  <div className="border-t border-slate-100 dark:border-white/[0.06] mt-1 pt-1">
                    <button
                      onClick={handleCreateShared}
                      disabled={creatingAccount}
                      className="w-full text-right px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-white/[0.05] flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {creatingAccount ? 'יוצר...' : 'חשבון משותף חדש'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center: Month nav — desktop only, hidden on mobile */}
        <div className="hidden md:flex flex-1 justify-center">
          {isMonthPage && currentAccount && (
            <MonthNav accountId={currentAccount.id} year={routeYear!} month={routeMonth!} compact />
          )}
        </div>

        {/* Left: PDF + icons */}
        <div className="flex items-center gap-1 shrink-0">
          {isMonthPage && currentAccount && (
            <PDFDownloadButton accountId={currentAccount.id} year={routeYear!} month={routeMonth!} />
          )}

          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            title="החלף מצב תצוגה"
          >
            {mounted && (resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />)}
          </button>

          {currentAccount && (
            <Link href={`/${currentAccount.id}/reports`} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors" title="דוחות AI">
              <Sparkles className="w-4 h-4" />
            </Link>
          )}

          {currentAccount && (
            <Link href={`/${currentAccount.id}/settings`} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/[0.07] rounded-lg transition-colors" title="הגדרות">
              <Settings className="w-4 h-4" />
            </Link>
          )}

          <div className="relative">
            <button
              onClick={() => { setShowUserMenu(!showUserMenu); setShowAccountMenu(false) }}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/[0.07] rounded-lg transition-colors"
            >
              <User className="w-4 h-4" />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className="absolute end-0 top-full mt-1 bg-white dark:bg-card border border-slate-200 dark:border-white/[0.1] rounded-xl shadow-lg z-20 min-w-[180px] py-1">
                  <div className="px-4 py-2.5 text-xs text-slate-400 truncate border-b border-slate-100 dark:border-white/[0.06]">
                    {userEmail}
                  </div>
                  <button
                    onClick={() => logout()}
                    className="w-full text-right px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    יציאה
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        </div>{/* end single row */}

        {/* ── Mobile only: MonthNav second row ── */}
        {isMonthPage && currentAccount && (
          <div className="flex justify-center pb-2 md:hidden">
            <MonthNav accountId={currentAccount.id} year={routeYear!} month={routeMonth!} compact />
          </div>
        )}

      </div>
    </header>
  )
}
