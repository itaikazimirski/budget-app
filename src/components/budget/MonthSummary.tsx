'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Wallet, X, Plus } from 'lucide-react'
import type { MonthlyStats } from '@/lib/types'
import CategoryCard from './CategoryCard'
import AddCategoryDialog from './AddCategoryDialog'

function formatILS(amount: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

interface MonthSummaryProps {
  stats: MonthlyStats
  accountId: string
  year: number
  month: number
}

export default function MonthSummary({ stats, accountId, year, month }: MonthSummaryProps) {
  const { totalIncome, totalExpenses, balance, incomeCategories, expenseCategories } = stats
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  const plannedIncome = incomeCategories.reduce((s, c) => s + c.budget_amount, 0)
  const plannedExpenses = expenseCategories.reduce((s, c) => s + c.budget_amount, 0)
  const plannedBalance = plannedIncome - plannedExpenses

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {/* Income card — clickable */}
        <button
          onClick={() => setIncomeOpen(true)}
          className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-right hover:border-emerald-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-emerald-100 rounded-lg p-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-sm text-slate-500 font-medium">הכנסות</span>
          </div>
          <p className="text-xl font-bold text-slate-900">{formatILS(totalIncome)}</p>
          <p className="text-xs text-slate-400 mt-1">תוכנן: {formatILS(plannedIncome)}</p>
        </button>

        {/* Expenses card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-rose-100 rounded-lg p-1.5">
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </div>
            <span className="text-sm text-slate-500 font-medium">הוצאות</span>
          </div>
          <p className="text-xl font-bold text-slate-900">{formatILS(totalExpenses)}</p>
          <p className="text-xs text-slate-400 mt-1">תוכנן: {formatILS(plannedExpenses)}</p>
        </div>

        {/* Balance card */}
        <div className={`rounded-2xl p-4 border shadow-sm ${balance >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-rose-50 border-rose-200'}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`rounded-lg p-1.5 ${balance >= 0 ? 'bg-indigo-100' : 'bg-rose-100'}`}>
              <Wallet className={`w-4 h-4 ${balance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`} />
            </div>
            <span className={`text-sm font-medium ${balance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>תזרים</span>
          </div>
          <p className={`text-xl font-bold ${balance >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
            {formatILS(balance)}
          </p>
          <p className="text-xs text-slate-400 mt-1">תוכנן: {formatILS(plannedBalance)}</p>
        </div>
      </div>

      {/* Income popup */}
      {incomeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIncomeOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-900 text-base">הכנסות</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  בפועל: {formatILS(totalIncome)} · תוכנן: {formatILS(plannedIncome)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAdd(true)}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="הוסף קטגוריית הכנסה"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button onClick={() => setIncomeOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-50">
              {incomeCategories.length === 0 ? (
                <div className="px-5 py-10 text-center text-slate-400 text-sm">
                  <p>אין קטגוריות הכנסה עדיין.</p>
                  <button onClick={() => setShowAdd(true)} className="mt-2 text-indigo-500 hover:underline text-xs">
                    הוסף אחת ←
                  </button>
                </div>
              ) : (
                incomeCategories.map((cat) => (
                  <CategoryCard key={cat.id} category={cat} accountId={accountId} year={year} month={month} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <AddCategoryDialog type="income" accountId={accountId} onClose={() => setShowAdd(false)} />
      )}
    </>
  )
}
