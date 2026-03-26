'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { CategoryWithStats } from '@/lib/types'

interface ExpensePieChartProps {
  categories: CategoryWithStats[]
}

function formatILS(amount: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-sm">
        <p className="font-semibold text-slate-800">{payload[0].name}</p>
        <p className="text-slate-600">{formatILS(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export default function ExpensePieChart({ categories }: ExpensePieChartProps) {
  const data = categories
    .filter((c) => c.budget_amount > 0)
    .map((c) => ({ name: c.name, value: c.budget_amount, color: c.color }))

  if (data.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <h3 className="font-semibold text-slate-900 text-sm mb-4">פילוח תקציב מתוכנן</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(value) => <span className="text-xs text-slate-600">{value}</span>} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
