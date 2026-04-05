'use client'

import { useState, useTransition } from 'react'
import { addCategory } from '@/app/actions/categories'
import { BUCKETS, CategoryGroupRecord } from '@/lib/types'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import EmojiPickerButton from './EmojiPickerButton'

interface AddCategoryDialogProps {
  type: 'income' | 'expense'
  accountId: string
  year: number
  month: number
  defaultGroupId?: string
  groups?: CategoryGroupRecord[]
  onClose: () => void
}

export default function AddCategoryDialog({ type, accountId, year, month, defaultGroupId, groups, onClose }: AddCategoryDialogProps) {
  const [selectedIcon, setSelectedIcon] = useState(type === 'income' ? '💰' : '📦')
  const [selectedBucket, setSelectedBucket] = useState<string>('מחיה')
  const [selectedGroup, setSelectedGroup] = useState<'מנוי' | 'ביטוח' | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(defaultGroupId)
  const [isFixed, setIsFixed] = useState(false)
  const [isOneTime, setIsOneTime] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('accountId', accountId)
    fd.set('type', type)
    fd.set('icon', selectedIcon)
    fd.set('bucket', selectedBucket)
    if (selectedGroup) fd.set('category_group', selectedGroup)
    if (selectedGroupId) fd.set('group_id', selectedGroupId)
    fd.set('is_fixed', String(isFixed))
    if (isOneTime) {
      fd.set('one_time_year', String(year))
      fd.set('one_time_month', String(month))
    }
    startTransition(async () => {
      const result = await addCategory(fd)
      if (result?.error) setError(result.error)
      else onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white dark:bg-card rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            הוסף קטגוריית {type === 'income' ? 'הכנסה' : 'הוצאה'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">

          {/* Recurring vs One-time */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsOneTime(false)}
              className={`flex-1 py-2 text-sm rounded-xl font-medium transition-colors ${
                !isOneTime
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-white/[0.06] text-slate-500 hover:bg-slate-200'
              }`}
            >
              🔁 קבועה
            </button>
            <button
              type="button"
              onClick={() => setIsOneTime(true)}
              className={`flex-1 py-2 text-sm rounded-xl font-medium transition-colors ${
                isOneTime
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 dark:bg-white/[0.06] text-slate-500 hover:bg-slate-200'
              }`}
            >
              1️⃣ חד-פעמית
            </button>
          </div>

          {isOneTime && (
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
              קטגוריה זו תופיע רק בחודש הנוכחי ולא תשוכפל לחודשים הבאים.
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name">שם הקטגוריה</Label>
            <Input
              id="name"
              name="name"
              placeholder={type === 'income' ? 'למשל: משכורת' : 'למשל: מזון'}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="monthlyAmount">תקציב חודשי (₪)</Label>
            <Input id="monthlyAmount" name="monthlyAmount" type="number" min="0" step="0.01" placeholder="0" />
            <p className="text-xs text-slate-400">ניתן לשנות לפי חודש בהמשך.</p>
          </div>

          {type === 'expense' && groups && groups.length > 1 && (
            <div className="space-y-1.5">
              <Label>קבוצה</Label>
              <select
                value={selectedGroupId ?? ''}
                onChange={(e) => setSelectedGroupId(e.target.value || undefined)}
                className="w-full text-sm border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 bg-white dark:bg-card text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">ללא קבוצה</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          {type === 'expense' && (
            <>
              <div className="space-y-1.5">
                <Label>סיווג</Label>
                <div className="flex gap-2">
                  {BUCKETS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setSelectedBucket(b)}
                      className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                        selectedBucket === b
                          ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>סוג מיוחד (אופציונלי)</Label>
                <div className="flex gap-2">
                  {(['מנוי', 'ביטוח'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setSelectedGroup(selectedGroup === g ? null : g)}
                      className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                        selectedGroup === g
                          ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-300'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {g === 'מנוי' ? '📺' : '🛡️'} {g}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {type === 'expense' && !isOneTime && (
            <button
              type="button"
              onClick={() => setIsFixed(!isFixed)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                isFixed
                  ? 'border-amber-400 bg-amber-50 text-amber-700'
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
              }`}
            >
              <div className="text-right">
                <p className="font-medium text-sm">הוצאה קבועה</p>
                <p className="text-xs opacity-70 mt-0.5">לא תופיע באוטומציית השורטקאט</p>
              </div>
              <span className="text-2xl">{isFixed ? '🔒' : '🔓'}</span>
            </button>
          )}

          <div className="space-y-1.5">
            <Label>אייקון</Label>
            <EmojiPickerButton value={selectedIcon} onChange={setSelectedIcon} />
          </div>

          {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{error}</div>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">ביטול</Button>
            <Button type="submit" disabled={isPending} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
              {isPending ? 'מוסיף...' : 'הוסף קטגוריה'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
