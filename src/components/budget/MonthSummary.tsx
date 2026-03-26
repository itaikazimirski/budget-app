import type { MonthlyStats } from '@/lib/types'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'

function formatILS(amount: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

export default function MonthSummary({ stats }: { stats: MonthlyStats }) {
  const { totalIncome, totalExpenses, balance, incomeCategories, expenseCategories } = stats

  const plannedIncome = incomeCategories.reduce((s, c) => s + c.budget_amount, 0)
  const plannedExpenses = expenseCategories.reduce((s, c) => s + c.budget_amount, 0)
  const plannedBalance = plannedIncome - plannedExpenses

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-emerald-100 rounded-lg p-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-sm text-slate-500 font-medium">הכנסות</span>
        </div>
        <p className="text-xl font-bold text-slate-900">{formatILS(totalIncome)}</p>
        <p className="text-xs text-slate-400 mt-1">תוכנן: {formatILS(plannedIncome)}</p>
      </div>

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
  )
}
