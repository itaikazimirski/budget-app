'use client'

import { useState, useEffect } from 'react'
import { Home, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import type { CategoryWithStats, Transaction } from '@/lib/types'
import HouseholdCardCompact from './HouseholdCardCompact'
import HouseholdRentCard from './HouseholdRentCard'
import AddCategoryDialog from './AddCategoryDialog'
import { formatILS } from '@/lib/budget-utils'

interface HouseholdSectionProps {
  categories: CategoryWithStats[]
  accountId: string
  year: number
  month: number
  transactions?: Transaction[]
}


export default function HouseholdSection({ categories, accountId, year, month, transactions }: HouseholdSectionProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('household-collapsed') === 'true'
  })

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('household-collapsed', String(next))
  }

  if (categories.length === 0) return null

  const totalBudget = categories.reduce((s, c) => s + c.budget_amount, 0)
  const totalActual = categories.reduce((s, c) => s + c.actual_amount, 0)

  // Split rent/mortgage from the rest
  const rentCats = categories.filter((c) => c.name === 'שכר דירה' || c.name === 'משכנתא')
  const otherCats = categories.filter((c) => c.name !== 'שכר דירה' && c.name !== 'משכנתא')


  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/[0.06] bg-indigo-50 dark:bg-indigo-950/30">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-100 dark:bg-indigo-900/60 rounded-lg p-1.5">
            <Home className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-right">
            <h3 className="font-semibold text-indigo-800 dark:text-indigo-300 text-sm">ניהול משק בית</h3>
            {totalBudget > 0 && (
              <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">
                {formatILS(totalActual)} מתוך {formatILS(totalBudget)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!collapsed && (
            <button
              onClick={() => setShowAdd(true)}
              className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
              title="הוסף הוצאת בית"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={toggleCollapsed}
            className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
            title={collapsed ? 'הצג' : 'כבה'}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Dashboard layout */}
      {!collapsed && <div className="p-4 flex gap-3">

        {/* Featured rent/mortgage card(s) — right side */}
        {rentCats.length > 0 && (
          <div className="flex flex-col gap-2">
            {rentCats.map((cat) => (
              <HouseholdRentCard
                key={cat.id}
                category={cat}
                accountId={accountId}
                year={year}
                month={month}
                transactions={transactions}
              />
            ))}
          </div>
        )}

        {/* Other categories — compact grid on left */}
        {otherCats.length > 0 && (
          <div className="flex-1 grid grid-cols-2 gap-2 content-start">
            {otherCats.map((cat) => (
              <HouseholdCardCompact
                key={cat.id}
                category={cat}
                accountId={accountId}
                year={year}
                month={month}
                transactions={transactions}
              />
            ))}
          </div>
        )}

        {/* If no rent cats, show all as compact grid */}
        {rentCats.length === 0 && (
          <div className="flex-1 grid grid-cols-2 gap-2">
            {categories.map((cat) => (
              <HouseholdCardCompact
                key={cat.id}
                category={cat}
                accountId={accountId}
                year={year}
                month={month}
                transactions={transactions}
              />
            ))}
          </div>
        )}
      </div>}

      {showAdd && (
        <AddCategoryDialog
          type="expense"
          accountId={accountId}
          year={year}
          month={month}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
