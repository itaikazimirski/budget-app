'use client'

import { useState } from 'react'
import { Home, Plus } from 'lucide-react'
import type { CategoryWithStats, Transaction } from '@/lib/types'
import HouseholdCard from './HouseholdCard'
import AddCategoryDialog from './AddCategoryDialog'

interface HouseholdSectionProps {
  categories: CategoryWithStats[]
  accountId: string
  year: number
  month: number
  transactions?: Transaction[]
}

function formatILS(amount: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

export default function HouseholdSection({ categories, accountId, year, month, transactions }: HouseholdSectionProps) {
  const [showAdd, setShowAdd] = useState(false)

  if (categories.length === 0) return null

  const totalBudget = categories.reduce((s, c) => s + c.budget_amount, 0)
  const totalActual = categories.reduce((s, c) => s + c.actual_amount, 0)
  const totalAll = totalBudget

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/[0.06] bg-indigo-50 dark:bg-indigo-950/30">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-100 dark:bg-indigo-900/60 rounded-lg p-1.5">
            <Home className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-right">
            <h3 className="font-semibold text-indigo-800 dark:text-indigo-300 text-sm">ניהול משק בית</h3>
            {totalBudget > 0 && (
              <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">
                {formatILS(totalActual)} מתוך {formatILS(totalAll)}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
          title="הוסף הוצאת בית"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        {categories.map((cat) => (
          <HouseholdCard
            key={cat.id}
            category={cat}
            accountId={accountId}
            year={year}
            month={month}
            transactions={transactions}
          />
        ))}
      </div>

      {showAdd && (
        <AddCategoryDialog
          type="expense"
          accountId={accountId}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
