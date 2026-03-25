'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Wallet, ChevronDown, LogOut, Settings, Plus, User } from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { createSharedAccount } from '@/app/actions/accounts'

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

  const pathParts = pathname.split('/')
  const currentAccountId = pathParts[1] ?? accounts[0]?.id
  const currentAccount = accounts.find((a) => a.id === currentAccountId) ?? accounts[0]

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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="bg-indigo-100 rounded-lg p-1.5">
            <Wallet className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight">כספית</span>
        </Link>

        {/* Account switcher */}
        <div className="relative">
          <button
            onClick={() => { setShowAccountMenu(!showAccountMenu); setShowUserMenu(false) }}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            <span className="max-w-[140px] truncate">{currentAccount?.name ?? 'בחר חשבון'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showAccountMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowAccountMenu(false)} />
              <div className="absolute start-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-[200px] py-1 overflow-hidden">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => switchAccount(account.id)}
                    className={`w-full text-right px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2 ${
                      account.id === currentAccountId ? 'text-indigo-600 font-medium bg-indigo-50' : 'text-slate-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${account.type === 'shared' ? 'bg-violet-400' : 'bg-indigo-400'}`} />
                    {account.name}
                  </button>
                ))}
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    onClick={handleCreateShared}
                    disabled={creatingAccount}
                    className="w-full text-right px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {creatingAccount ? 'יוצר...' : 'חשבון משותף חדש'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right side: settings + user */}
        <div className="flex items-center gap-1">
          {currentAccount && (
            <Link
              href={`/${currentAccount.id}/settings`}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="הגדרות"
            >
              <Settings className="w-4 h-4" />
            </Link>
          )}

          <div className="relative">
            <button
              onClick={() => { setShowUserMenu(!showUserMenu); setShowAccountMenu(false) }}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <User className="w-4 h-4" />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className="absolute end-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-[180px] py-1">
                  <div className="px-4 py-2.5 text-xs text-slate-400 truncate border-b border-slate-100">
                    {userEmail}
                  </div>
                  <button
                    onClick={() => logout()}
                    className="w-full text-right px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    יציאה
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
