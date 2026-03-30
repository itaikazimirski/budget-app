'use client'

import { useState } from 'react'
import { Home, Plus, X } from 'lucide-react'
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

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: 'short' })
}

export default function HouseholdSection({ categories, accountId, year, month, transactions }: HouseholdSectionProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [showRentPopup, setShowRentPopup] = useState(false)

  if (categories.length === 0) return null

  const totalBudget = categories.reduce((s, c) => s + c.budget_amount, 0)
  const totalActual = categories.reduce((s, c) => s + c.actual_amount, 0)

  // Split rent/mortgage from the rest
  const rentCats = categories.filter((c) => c.name === 'שכר דירה' || c.name === 'משכנתא')
  const otherCats = categories.filter((c) => c.name !== 'שכר דירה' && c.name !== 'משכנתא')

  const rentActual = rentCats.reduce((s, c) => s + c.actual_amount, 0)
  const rentBudget = rentCats.reduce((s, c) => s + c.budget_amount, 0)
  const rentPercentage = rentBudget > 0 ? Math.min((rentActual / rentBudget) * 100, 100) : 0
  const rentIsOver = rentActual > rentBudget && rentBudget > 0
  const rentTransactions = (transactions ?? []).filter((tx) =>
    rentCats.some((c) => c.id === tx.category_id)
  )

  const rentBarColor = rentIsOver ? 'bg-rose-400' : rentPercentage > 80 ? 'bg-amber-400' : 'bg-indigo-400'

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
        <button
          onClick={() => setShowAdd(true)}
          className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
          title="הוסף הוצאת בית"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Dashboard layout */}
      <div className="p-4 flex gap-3">

        {/* Featured rent/mortgage card — right side */}
        {rentCats.length > 0 && (
          <div
            className={`w-36 shrink-0 rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all
              bg-indigo-50 dark:bg-indigo-950/30
              ${rentIsOver ? 'border-rose-200 dark:border-rose-900/50' : 'border-indigo-200 dark:border-indigo-800/50'}
              ${rentTransactions.length > 0 ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}
            `}
            onClick={() => rentTransactions.length > 0 && setShowRentPopup(true)}
          >
            <div className="text-right">
              <span className="text-3xl">🏠</span>
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mt-2 leading-tight">
                {rentCats.map((c) => c.name).join(' /\n')}
              </p>
            </div>

            <div className="text-right">
              <p className={`text-xl font-bold ${rentIsOver ? 'text-rose-600' : 'text-indigo-900 dark:text-white'}`}>
                {formatILS(rentActual)}
              </p>
              {rentBudget > 0 && (
                <p className="text-xs text-indigo-400 mt-0.5">{formatILS(rentBudget)}</p>
              )}
            </div>

            {rentBudget > 0 && (
              <div className="space-y-1">
                <div className="h-1.5 bg-indigo-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${rentBarColor}`} style={{ width: `${rentPercentage}%` }} />
                </div>
                <p className="text-xs text-indigo-400 text-left">{Math.round(rentPercentage)}%</p>
              </div>
            )}
          </div>
        )}

        {/* Other categories — compact grid on left */}
        {otherCats.length > 0 && (
          <div className="flex-1 grid grid-cols-2 gap-2 content-start">
            {otherCats.map((cat) => (
              <HouseholdCard
                key={cat.id}
                category={cat}
                accountId={accountId}
                year={year}
                month={month}
                transactions={transactions}
                compact
              />
            ))}
          </div>
        )}

        {/* If no rent cats, show all as compact grid */}
        {rentCats.length === 0 && (
          <div className="flex-1 grid grid-cols-2 gap-2">
            {categories.map((cat) => (
              <HouseholdCard
                key={cat.id}
                category={cat}
                accountId={accountId}
                year={year}
                month={month}
                transactions={transactions}
                compact
              />
            ))}
          </div>
        )}
      </div>

      {/* Rent popup */}
      {showRentPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowRentPopup(false)}>
          <div className="bg-white dark:bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="text-right">
                <h2 className="font-bold text-slate-900 dark:text-white text-base">🏠 שכר דירה / משכנתא</h2>
                <p className="text-xs text-slate-400 mt-0.5">סה"כ: {formatILS(rentActual)}</p>
              </div>
              <button onClick={() => setShowRentPopup(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-3 space-y-2">
              {rentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between bg-slate-50 dark:bg-secondary rounded-xl px-4 py-3 gap-3">
                  <span className="text-xs text-slate-400 shrink-0">{formatDate(tx.date)}</span>
                  <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 text-right truncate">{tx.notes ?? '—'}</span>
                  <span className="font-semibold text-sm shrink-0 text-slate-800 dark:text-white">{formatILS(tx.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
