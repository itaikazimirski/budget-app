'use client'

import { useState, useTransition } from 'react'
import type { CategoryWithStats } from '@/lib/types'
import { updateMonthBudget, updateCategory } from '@/app/actions/categories'
import { CATEGORY_ICONS, BUCKETS } from '@/lib/types'
import { Edit2, Check, X, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CategoryCardProps {
  category: CategoryWithStats
  accountId: string
  year: number
  month: number
}

function formatILS(amount: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: 'short' })
}

export default function CategoryCard({ category, accountId, year, month }: CategoryCardProps) {
  const [editing, setEditing] = useState(false)
  const [budgetInput, setBudgetInput] = useState(String(category.budget_amount))
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [nameInput, setNameInput] = useState(category.name)
  const [selectedIcon, setSelectedIcon] = useState(category.icon ?? '📦')
  const [selectedBucket, setSelectedBucket] = useState(category.bucket ?? 'מחיה')
  const [selectedGroup, setSelectedGroup] = useState<'מנוי' | 'ביטוח' | 'משק בית' | null>(category.category_group ?? null)
  const [isFixed, setIsFixed] = useState(category.is_fixed ?? false)
  const [isPending, startTransition] = useTransition()

  const { actual_amount, budget_amount, percentage, type } = category
  const isOver = actual_amount > budget_amount && budget_amount > 0
  const barColor = type === 'income'
    ? (percentage >= 100 ? 'bg-emerald-500' : 'bg-emerald-400')
    : isOver
      ? 'bg-rose-500'
      : percentage > 85
        ? 'bg-rose-400'
        : percentage > 60
          ? 'bg-amber-400'
          : 'bg-emerald-400'

  function handleSaveBudget() {
    const amount = parseFloat(budgetInput)
    if (isNaN(amount) || amount < 0) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set('accountId', accountId)
      fd.set('categoryId', category.id)
      fd.set('year', String(year))
      fd.set('month', String(month))
      fd.set('monthlyAmount', String(amount))
      await updateMonthBudget(fd)
      setEditing(false)
    })
  }

  function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const fd = new FormData()
      fd.set('categoryId', category.id)
      fd.set('accountId', accountId)
      fd.set('name', nameInput)
      fd.set('icon', selectedIcon)
      fd.set('bucket', selectedBucket)
      if (selectedGroup) fd.set('category_group', selectedGroup)
      fd.set('is_fixed', String(isFixed))
      await updateCategory(fd)
      setShowEditDialog(false)
    })
  }

  return (
    <>
      <div className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group rounded-xl ${isOver ? 'border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/10' : ''}`}>

        {/* Top row: category name + amount ratio */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">{category.icon ?? '📦'}</span>
            <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{category.name}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {budget_amount > 0 ? (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                <span className={`font-semibold ${isOver ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}>
                  {formatILS(actual_amount)}
                </span>
                {' / '}
                {formatILS(budget_amount)}
              </span>
            ) : (
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{formatILS(actual_amount)}</span>
            )}

            <button
              onClick={() => setShowEditDialog(true)}
              className="p-1 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
              title="ערוך קטגוריה"
            >
              <Settings2 className="w-3 h-3" />
            </button>

            {!editing ? (
              <button
                onClick={() => { setBudgetInput(String(budget_amount)); setEditing(true) }}
                className="p-1 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="ערוך תקציב לחודש זה"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-xs">₪</span>
                <input
                  type="number"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="w-20 text-xs border border-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-indigo-400"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBudget(); if (e.key === 'Escape') setEditing(false) }}
                />
                <button onClick={handleSaveBudget} disabled={isPending} className="p-1 text-emerald-500 hover:text-emerald-600">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setEditing(false)} className="p-1 text-slate-400 hover:text-slate-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {budget_amount > 0 ? (
          <div className="h-3 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        ) : (
          <p className="text-xs text-slate-300">אין תקציב מוגדר — לחץ ✏️ להגדרה לחודש זה</p>
        )}
      </div>

      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">עריכת קטגוריה</h2>
              <button onClick={() => setShowEditDialog(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="catName">שם הקטגוריה</Label>
                <Input
                  id="catName"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  required
                  autoFocus
                />
              </div>
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
              {category.type === 'expense' && (
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
              )}

              {category.type === 'expense' && (
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
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {CATEGORY_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setSelectedIcon(icon)}
                      className={`w-9 h-9 text-xl rounded-lg transition-all flex items-center justify-center ${
                        selectedIcon === icon
                          ? 'bg-indigo-100 ring-2 ring-indigo-400 scale-110'
                          : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1">ביטול</Button>
                <Button type="submit" disabled={isPending} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                  {isPending ? 'שומר...' : 'שמור'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
