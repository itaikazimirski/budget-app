import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')
  const year = parseInt(searchParams.get('year') ?? '')
  const month = parseInt(searchParams.get('month') ?? '')
  if (!accountId || isNaN(year) || isNaN(month)) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  const [
    { data: categories },
    { data: templates },
    { data: monthOverrides },
    { data: transactions },
  ] = await Promise.all([
    supabase.from('categories').select('*').eq('account_id', accountId),
    supabase.from('budget_templates').select('*').eq('account_id', accountId),
    supabase.from('month_budgets').select('*').eq('account_id', accountId).eq('year', year).eq('month', month),
    supabase.from('transactions').select('amount, type, category_id').eq('account_id', accountId).gte('date', startDate).lte('date', endDate),
  ])

  const templateMap = Object.fromEntries((templates ?? []).map((t) => [t.category_id, t.monthly_amount]))
  const overrideMap = Object.fromEntries((monthOverrides ?? []).map((o) => [o.category_id, o.monthly_amount]))
  const actualMap: Record<string, number> = {}
  for (const tx of transactions ?? []) {
    if (tx.category_id) actualMap[tx.category_id] = (actualMap[tx.category_id] ?? 0) + tx.amount
  }

  const cats = (categories ?? []).filter((c) =>
    c.one_time_year === null || (c.one_time_year === year && c.one_time_month === month)
  )

  const expenseCategories = cats.filter((c) => c.type === 'expense').map((c) => {
    const budget = overrideMap[c.id] ?? templateMap[c.id] ?? 0
    const actual = actualMap[c.id] ?? 0
    return { ...c, budget_amount: budget, actual_amount: actual, remaining: budget - actual, percentage: budget > 0 ? Math.min((actual / budget) * 100, 999) : 0 }
  })

  const totalIncome = (transactions ?? []).filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = (transactions ?? []).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  return NextResponse.json({ totalIncome, totalExpenses, balance: totalIncome - totalExpenses, expenseCategories })
}
