'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { CategoryWithStats } from '@/lib/types'
import { BUCKETS } from '@/lib/types'
import CategoryCard from './CategoryCard'

interface BucketSummaryProps {
  categories: CategoryWithStats[]
  accountId: string
  year: number
  month: number
}

function formatILS(amount: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

const BUCKET_COLORS = {
  'מחיה':   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   bar: 'bg-blue-400' },
  'מותרות': { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', bar: 'bg-violet-400' },
  'חסכון':  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-400' },
}

export default function BucketSummary({ categories, accountId, year, month }: BucketSummaryProps) {
  const [openBucket, setOpenBucket] = useState<string | null>(null)

  const totalBudget = categories.reduce((s, c) => s + c.budget_amount, 0)
  const totalActual = categories.reduce((s, c) => s + c.actual_amount, 0)

  const bucketData = BUCKETS.map((bucket) => {
    const cats = categories.filter((c) => c.bucket === bucket)
    const budget = cats.reduce((s, c) => s + c.budget_amount, 0)
    const actual = cats.reduce((s, c) => s + c.actual_amount, 0)
    const percentage = totalBudget > 0 ? Math.round((budget / totalBudget) * 100) : 0
    return { bucket, cats, budget, actual, percentage }
  })

  // Categories with no bucket assigned
  const unassigned = categories.filter((c) => !c.bucket)

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <h3 className="font-semibold text-slate-900 text-sm mb-3">פילוח הוצאות</h3>
        <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-3">
          {bucketData.map(({ bucket, percentage }) => (
            percentage > 0 && (
              <div
                key={bucket}
                className={`${BUCKET_COLORS[bucket as keyof typeof BUCKET_COLORS].bar} transition-all`}
                style={{ width: `${percentage}%` }}
              />
            )
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {bucketData.map(({ bucket, budget, actual, percentage }) => {
            const colors = BUCKET_COLORS[bucket as keyof typeof BUCKET_COLORS]
            return (
              <button
                key={bucket}
                onClick={() => setOpenBucket(openBucket === bucket ? null : bucket)}
                className={`${colors.bg} ${colors.border} border rounded-xl p-3 text-right transition-all hover:opacity-80`}
              >
                <div className={`text-xs font-semibold ${colors.text} flex items-center justify-between`}>
                  <span>{percentage}%</span>
                  <span>{bucket}</span>
                </div>
                <p className="text-sm font-bold text-slate-900 mt-1">{formatILS(actual)}</p>
                <p className="text-xs text-slate-400">תוכנן: {formatILS(budget)}</p>
                <div className="mt-1.5 flex items-center justify-end gap-1">
                  {openBucket === bucket
                    ? <ChevronUp className={`w-3 h-3 ${colors.text}`} />
                    : <ChevronDown className={`w-3 h-3 ${colors.text}`} />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Expanded bucket categories */}
      {openBucket && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className={`px-4 py-3 border-b ${BUCKET_COLORS[openBucket as keyof typeof BUCKET_COLORS].border} ${BUCKET_COLORS[openBucket as keyof typeof BUCKET_COLORS].bg}`}>
            <h3 className={`font-semibold text-sm ${BUCKET_COLORS[openBucket as keyof typeof BUCKET_COLORS].text}`}>{openBucket}</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {bucketData.find(b => b.bucket === openBucket)?.cats.map((cat) => (
              <CategoryCard key={cat.id} category={cat} accountId={accountId} year={year} month={month} />
            ))}
          </div>
        </div>
      )}

      {/* Unassigned categories */}
      {unassigned.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden opacity-60">
          <div className="px-4 py-2 border-b border-slate-100">
            <p className="text-xs text-slate-400">ללא סיווג ({unassigned.length})</p>
          </div>
          <div className="divide-y divide-slate-50">
            {unassigned.map((cat) => (
              <CategoryCard key={cat.id} category={cat} accountId={accountId} year={year} month={month} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
