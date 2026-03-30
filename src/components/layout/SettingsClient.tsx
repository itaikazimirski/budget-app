'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateAccountName, inviteMember, generateApiKey, deleteApiKey } from '@/app/actions/accounts'
import { setupHouseholdCategories } from '@/app/actions/categories'
import { User, Edit2, Check, X, UserPlus, Key, Copy, Trash2, Plus, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Account, AccountMember } from '@/lib/types'

interface ApiKey {
  id: string
  name: string
  key_value: string
  created_at: string
}

interface SettingsClientProps {
  account: Account
  members: AccountMember[]
  isOwner: boolean
  apiKeys: ApiKey[]
  hasHousehold: boolean
}

export default function SettingsClient({ account, members, isOwner, apiKeys, hasHousehold }: SettingsClientProps) {
  const router = useRouter()
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(account.name)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
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

  function handleGenerateKey() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('accountId', account.id)
      const result = await generateApiKey(fd)
      if (result?.key) setNewKey(result.key)
    })
  }

  function handleDeleteKey(keyId: string) {
    if (!confirm('למחוק את המפתח הזה?')) return
    startTransition(async () => {
      await deleteApiKey(keyId, account.id)
    })
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">
      {/* Account name */}
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

      {/* Members */}
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
          <div className="border-t border-slate-100 p4">
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

      {/* Household management */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-1">
          <Home className="w-4 h-4 text-indigo-500" />
          <h2 className="font-semibold text-slate-900 text-sm">ניהול משק בית</h2>
        </div>
        <p className="text-xs text-slate-500 mb-3">יוצר אוטומטית קטגוריות קבועות של הוצאות הבית (שכר דירה, חשמל, מים וכו׳).</p>
        {hasHousehold ? (
          <p className="text-xs text-emerald-600 font-medium">✓ ניהול משק בית פעיל</p>
        ) : (
          <button
            onClick={() => startTransition(async () => {
              const result = await setupHouseholdCategories(account.id)
              if (result?.error) alert('שגיאה: ' + result.error)
              else router.refresh()
            })}
            disabled={isPending}
            className="flex items-center gap-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl px-4 py-2.5 transition-colors"
          >
            <Home className="w-4 h-4" />
            {isPending ? 'מפעיל...' : 'הפעל ניהול משק בית'}
          </button>
        )}
      </div>

      {/* Budget template */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <h2 className="font-semibold text-slate-900 text-sm mb-1">תבנית התקציב</h2>
        <p className="text-xs text-slate-500 mb-3">ניהול הסכומים החודשיים הדיפולטיביים לכל הקטגוריות.</p>
        <a href={`/${account.id}/template`} className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:underline">
          פתח עורך התבנית ←
        </a>
      </div>

      {/* API Keys for Apple Shortcuts */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              Apple Shortcuts — מפתח API
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">לחיבור האפליקציה לאוטומציה מהאייפון</p>
          </div>
          <button
            onClick={handleGenerateKey}
            disabled={isPending}
            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 hover:bg-indigo-100 rounded-lg px-3 py-1.5 transition-colors"
          >
            <Plus className="w-3 h-3" />
            צור מפתח
          </button>
        </div>

        {newKey && (
          <div className="mx-4 my-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <p className="text-xs text-emerald-700 font-medium mb-2">✓ מפתח חדש נוצר — העתק אותו עכשיו, הוא לא יוצג שוב</p>
            <div className="flex items-center gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-2">
              <code className="flex-1 text-xs text-slate-700 font-mono break-all">{newKey}</code>
              <button onClick={() => copyKey(newKey)} className="shrink-0 text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                <Copy className="w-3 h-3" />
                {copied ? 'הועתק!' : 'העתק'}
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-slate-50">
          {apiKeys.length === 0 && !newKey ? (
            <p className="px-4 py-6 text-center text-xs text-slate-400">אין מפתחות עדיין. לחץ "צור מפתח" כדי להתחיל.</p>
          ) : (
            apiKeys.map((k) => (
              <div key={k.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-slate-700 font-medium">{k.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{k.key_value.slice(0, 16)}••••</p>
                </div>
                <button onClick={() => handleDeleteKey(k.id)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
