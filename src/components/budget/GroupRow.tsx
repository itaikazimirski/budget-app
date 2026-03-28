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
  const percentage = totalBudget > 0 ? Math.min((totalActual / totalBudget) * 100, 100) : 0
  const isOver = totalActual > totalBudget && totalBudget > 0
  const { label, icon } = GROUP_CONFIG[groupName]

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 hover:bg-slate-50 transition-colors text-right"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">{icon}</span>
            <span className="text-sm font-medium text-slate-800">{label}</span>
            <span className="text-xs text-slate-400">({categories.length})</span>
            {isOver && (
              <span className="text-xs bg-rose-100 text-rose-600 rounded px-1.5 py-0.5">חריגה!</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-semibold text-slate-800">{formatILS(totalActual)}</span>
            {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </div>
        </div>

        {totalBudget > 0 && (
          <div className="space-y-1">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isOver ? 'bg-rose-500' : 'bg-indigo-400'}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>{Math.round(percentage)}%</span>
              <span className={isOver ? 'text-rose-500' : ''}>
                {isOver
                  ? `${formatILS(totalActual - totalBudget)} חריגה`
                  : `${formatILS(totalBudget - totalActual)} נותר`} מתוך {formatILS(totalBudget)}
              </span>
            </div>
          </div>
        )}
      </button>

      {open && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {categories.map((cat) => (
            <div key={cat.id} className="pr-4">
              <CategoryCard
                category={cat}
                accountId={accountId}
                year={year}
                month={month}
                transactions={transactions}
              />
            </div>
          ))}
        </div>
      )}
    </>
  )
}
