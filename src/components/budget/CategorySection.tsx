'use client'

import { useState } from 'react'
import type { CategoryWithStats } from '@/lib/types'
import CategoryCard from './CategoryCard'
import AddCategoryDialog from './AddCategoryDialog'
import { Plus } from 'lucide-react'

interface CategorySectionProps {
  title: string
  categories: CategoryWithStats[]
  type: 'income' | 'expense'
  accountId: string
  year: number
  month: number
}

function formatILS(amount: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

export default function CategorySection({ title, categories, type, accountId, year, month }: CategorySectionProps) {
  const [showAdd, setShowAdd] = useState(false)

  const total = categories.reduce((s, c) => s + c.actual_amount, 0)
  const budgetTotal = categories.reduce((s, c) => s + c.budget_amount, 0)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
          {budgetTotal > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              {formatILS(total)} מתוך {formatILS(budgetTotal)}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          title={`הוסף קטגוריית ${type === 'income' ? 'הכנסה' : 'הוצאה'}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="divide-y divide-slate-50">
        {categories.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-400 text-sm">
            <p>אין קטגוריות {type === 'income' ? 'הכנסה' : 'הוצאה'} עדיין.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-2 text-indigo-500 hover:underline text-xs"
            >
              הוסף אחת ←
            </button>
          </div>
        ) : (
          categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              accountId={accountId}
              year={year}
              month={month}
            />
          ))
        )}
      </div>

      {showAdd && (
        <AddCategoryDialog
          type={type}
          accountId={accountId}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
