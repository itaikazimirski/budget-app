'use client'
import { formatILS } from '@/lib/budget-utils'

import { useState } from 'react'
import { X, Lock } from 'lucide-react'
import type { CategoryWithStats } from '@/lib/types'

interface FixedExpensesButtonProps {
  categories: CategoryWithStats[]
}


export default function FixedExpensesButton({ categories }: FixedExpensesButtonProps) {
  const [open, setOpen] = useState(false)

  const fixedCats = categories.filter((c) => c.is_fixed)
  if (fixedCats.length === 0) return null

  const totalFixed = fixedCats.reduce((s, c) => s + c.budget_amount, 0)
  const totalAll = categories.reduce((s, c) => s + c.budget_amount, 0)
  const percentage = totalAll > 0 ? Math.round((totalFixed / totalAll) * 100) : 0

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl px-4 py-2.5 hover:bg-amber-100 transition-colors w-full"
      >
        <Lock className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-right">הוצאות קבועות ({fixedCats.length})</span>
        <span className="font-semibold">{formatILS(totalFixed)}</span>
        <span className="text-xs opacity-70">· {percentage}% מהתקציב</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-white dark:bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="text-right">
                <h2 className="font-bold text-slate-900 text-base">🔒 הוצאות קבועות</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  סה"כ: {formatILS(totalFixed)} · {percentage}% מהתקציב הכולל
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-3 space-y-2">
              {fixedCats.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between bg-slate-50 dark:bg-secondary rounded-xl px-4 py-3 gap-3">
                  <span className="text-base shrink-0">{cat.icon ?? '📦'}</span>
                  <span className="text-sm text-slate-700 flex-1 text-right">{cat.name}</span>
                  <span className="font-semibold text-sm text-slate-800 shrink-0">{formatILS(cat.budget_amount)}</span>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-secondary rounded-b-2xl">
              <div className="flex justify-between text-sm font-semibold text-slate-800">
                <span>{percentage}% מהתקציב</span>
                <span>סה"כ: {formatILS(totalFixed)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
