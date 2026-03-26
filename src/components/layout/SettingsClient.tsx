'use client'

import { useState, useTransition } from 'react'
import { updateAccountName, inviteMember } from '@/app/actions/accounts'
import { User, Edit2, Check, X, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Account, AccountMember } from '@/lib/types'

interface SettingsClientProps {
  account: Account
  members: AccountMember[]
  isOwner: boolean
}

export default function SettingsClient({ account, members, isOwner }: SettingsClientProps) {
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(account.name)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function saveName() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('accountId', account.id)
      fd.set('name', nameInput)
      await updateAccountName(fd)
      setEditingName(false)
    })
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError(null)
    setInviteSuccess(false)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('accountId', account.id)
      fd.set('email', inviteEmail)
      const result = await inviteMember(fd)
      if (result?.error) setInviteError(result.error)
      else { setInviteSuccess(true); setInviteEmail('') }
    })
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <h2 className="font-semibold text-slate-900 text-sm mb-3">שם החשבון</h2>
        <div className="flex items-center gap-2">
          {editingName ? (
            <>
              <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="flex-1 h-9" autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }} />
              <button onClick={saveName} disabled={isPending} className="p-2 text-emerald-500 hover:text-emerald-600"><Check className="w-4 h-4" /></button>
              <button onClick={() => setEditingName(false)} className="p-2 text-slate-400 hover:text-slate-500"><X className="w-4 h-4" /></button>
            </>
          ) : (
            <>
              <span className="flex-1 text-slate-800 font-medium">{account.name}</span>
              {isOwner && (
                <button onClick={() => { setNameInput(account.name); setEditingName(true) }} className="p-2 text-slate-400 hover:text-slate-600">
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          סוג: <span>{account.type === 'personal' ? 'אישי' : 'משותף'}</span>
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-sm">משתתפים</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <span className="text-sm text-slate-700">{m.display_name ?? 'לא ידוע'}</span>
            </div>
          ))}
        </div>

        {account.type === 'shared' && isOwner && (
          <div className="border-t border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-3 font-medium">הזמנת משתתף לפי אימייל</p>
            <form onSubmit={handleInvite} className="flex gap-2">
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="האימייל שלהם" required className="flex-1 h-9" />
              <Button type="submit" disabled={isPending} size="sm" className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                הזמן
              </Button>
            </form>
            {inviteError && <p className="text-xs text-rose-600 mt-2">{inviteError}</p>}
            {inviteSuccess && <p className="text-xs text-emerald-600 mt-2">✓ המשתתף נוסף בהצלחה!</p>}
            <p className="text-xs text-slate-400 mt-2">המשתתף צריך להיות רשום בתקציב-לי קודם.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <h2 className="font-semibold text-slate-900 text-sm mb-1">תבנית התקציב</h2>
        <p className="text-xs text-slate-500 mb-3">ניהול הסכומים החודשיים הדיפולטיביים לכל הקטגוריות.</p>
        <a href={`/${account.id}/template`} className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:underline">
          פתח עורך התבנית ←
        </a>
      </div>
    </div>
  )
}
