'use client'

import { useState, useTransition } from 'react'
import type { CategoryWithStats } from '@/lib/types'
import { updateMonthBudget, updateCategory } from '@/app/actions/categories'
import { CATEGORY_COLORS } from '@/lib/types'
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

export default function CategoryCard({ category, accountId, year, month }: CategoryCardProps) {
  const [editing, setEditing] = useState(false)
  const [budgetInput, setBudgetInput] = useState(String(category.budget_amount))
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [nameInput, setNameInput] = useState(category.name)
  const [selectedColor, setSelectedColor] = useState(category.color)
  const [isPending, startTransition] = useTransition()

  const { actual_amount, budget_amount, percentage, type } = category
  const isOver = actual_amount > budget_amount && budget_amount > 0
  const barColor = type === 'income'
    ? (percentage >= 100 ? 'bg-emerald-500' : 'bg-emerald-400')
    : (isOver ? 'bg-rose-500' : percentage > 80 ? 'bg-amber-400' : 'bg-indigo-400')

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
      fd.set('color', selectedColor)
      await updateCategory(fd)
      setShowEditDialog(false)
    })
  }

  return (
    <>
      <div className="px-4 py-3 hover:bg-slate-50 transition-colors group">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
            <span className="text-sm font-medium text-slate-800 truncate">{category.name}</span>
            {isOver && (
              <span className="text-xs bg-rose-100 text-rose-600 rounded px-1.5 py-0.5 shrink-0">חריגה!</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-semibold text-slate-800">{formatILS(actual_amount)}</span>

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

        {budget_amount > 0 ? (
          <div className="space-y-1">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>{Math.round(percentage)}%</span>
              <span className={isOver ? 'text-rose-500' : ''}>
                {isOver
                  ? `${formatILS(Math.abs(category.remaining))} חריגה`
                  : `${formatILS(category.remaining)} נותר`} מתוך {formatILS(budget_amount)}
              </span>
            </div>
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
                <Label>צבע</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        selectedColor === color ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
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
