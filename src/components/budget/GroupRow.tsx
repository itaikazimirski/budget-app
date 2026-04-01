'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { CategoryWithStats, Transaction } from '@/lib/types'
import CategoryCard from './CategoryCard'

interface GroupRowProps {
  groupName: 'מנוי' | 'ביטוח'
  categories: CategoryWithStats[]
  accountId: string
  year: number
  month: number
  transactions?: Transaction[]
}

const GROUP_CONFIG = {
  'מנוי': { label: 'מנויים', icon: '📺' },
  'ביטוח': { label: 'ביטוחים', icon: '🛡️' },
}

function formatILS(amount: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

export default function GroupRow({ groupName, categories, accountId, year, month, transactions }: GroupRowProps) {
  const [open, setOpen] = useState(false)

  const totalBudget = categories.reduce((s, c) => s + c.budget_amount, 0)
  const totalActual = categories.reduce((s, c) => s + c.actual_amount, 0)
  const rawPercentage = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0
  const percentage = Math.min(rawPercentage, 100)
  const isOver = totalActual > totalBudget && totalBudget > 0
  const { label, icon } = GROUP_CONFIG[groupName]

  const barColor = isOver
    ? 'bg-rose-500'
    : rawPercentage > 85
      ? 'bg-rose-400'
      : rawPercentage > 60
        ? 'bg-amber-400'
        : 'bg-emerald-400'

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors text-right rounded-xl ${isOver ? 'border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/10' : ''}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">{icon}</span>
            <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
            <span className="text-xs text-slate-400">({categories.length})</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {totalBudget > 0 ? (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                <span className={`font-semibold ${isOver ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}>
                  {formatILS(totalActual)}
                </span>
                {' / '}
                {formatILS(totalBudget)}
              </span>
            ) : (
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatILS(totalActual)}</span>
            )}
            {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </div>
        </div>

        {totalBudget > 0 && (
          <div className="h-3 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-white/[0.06] divide-y divide-slate-100 dark:divide-white/[0.06]">
          {categories.map((cat) => (
            <div key={cat.id} className="pr-4">
              <CategoryCard
                category={cat}
                accountId={accountId}
                year={year}
                month={month}
               
              />
            </div>
          ))}
        </div>
      )}
    </>
  )
}
