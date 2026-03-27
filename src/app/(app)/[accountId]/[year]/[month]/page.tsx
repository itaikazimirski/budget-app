import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { CategoryWithStats, MonthlyStats } from '@/lib/types'
import MonthNav from '@/components/budget/MonthNav'
import MonthSummary from '@/components/budget/MonthSummary'
import CategorySection from '@/components/budget/CategorySection'
import TransactionTable from '@/components/budget/TransactionTable'
import BucketSummary from '@/components/budget/BucketSummary'

export default async function MonthPage(props: PageProps<'/[accountId]/[year]/[month]'>) {
  const { accountId, year: yearStr, month: monthStr } = await props.params
  const year = parseInt(yearStr)
  const month = parseInt(monthStr)

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) redirect('/')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify membership
  const { data: membership } = await supabase
    .from('account_members')
    .select('display_name')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/')

  // Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('account_id', accountId)
    .order('name')

  // Fetch budget templates
  const { data: templates } = await supabase
    .from('budget_templates')
    .select('*')
    .eq('account_id', accountId)

  // Fetch monthly overrides for this month
  const { data: monthOverrides } = await supabase
    .from('month_budgets')
    .select('*')
    .eq('account_id', accountId)
    .eq('year', year)
    .eq('month', month)

  // Fetch transactions for this month
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, category:categories(*)')
    .eq('account_id', accountId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  // Fetch member display names for "entered by"
  const { data: members } = await supabase
    .from('account_members')
    .select('user_id, display_name')
    .eq('account_id', accountId)

  const memberMap = Object.fromEntries((members ?? []).map((m) => [m.user_id, m.display_name]))

  const txWithNames = (transactions ?? []).map((tx) => ({
    ...tx,
    entered_by: memberMap[tx.user_id] ?? 'Unknown',
  }))

  // Build budget map: category_id → budget amount (override takes priority)
  const templateMap = Object.fromEntries((templates ?? []).map((t) => [t.category_id, t.monthly_amount]))
  const overrideMap = Object.fromEntries((monthOverrides ?? []).map((o) => [o.category_id, o.monthly_amount]))

  // Calculate actual spending per category
  const actualMap: Record<string, number> = {}
  for (const tx of transactions ?? []) {
    if (tx.category_id) {
      actualMap[tx.category_id] = (actualMap[tx.category_id] ?? 0) + tx.amount
    }
  }

  // Build stats
  const cats = categories ?? []
  const incomeCategories: CategoryWithStats[] = cats
    .filter((c) => c.type === 'income')
    .map((c) => {
      const budget = overrideMap[c.id] ?? templateMap[c.id] ?? 0
      const actual = actualMap[c.id] ?? 0
      return {
        ...c,
        budget_amount: budget,
        actual_amount: actual,
        remaining: budget - actual,
        percentage: budget > 0 ? Math.min((actual / budget) * 100, 999) : 0,
      }
    })

  const expenseCategories: CategoryWithStats[] = cats
    .filter((c) => c.type === 'expense')
    .map((c) => {
      const budget = overrideMap[c.id] ?? templateMap[c.id] ?? 0
      const actual = actualMap[c.id] ?? 0
      return {
        ...c,
        budget_amount: budget,
        actual_amount: actual,
        remaining: budget - actual,
        percentage: budget > 0 ? Math.min((actual / budget) * 100, 999) : 0,
      }
    })

  const totalIncome = (transactions ?? [])
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = (transactions ?? [])
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const stats: MonthlyStats = {
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    incomeCategories,
    expenseCategories,
  }

  const hasMonthOverride = (monthOverrides ?? []).length > 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <MonthNav accountId={accountId} year={year} month={month} />

      <MonthSummary stats={stats} accountId={accountId} year={year} month={month} />

      {hasMonthOverride && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ✦ חלק מהקטגוריות קיבלו סכום מותאם לחודש זה.
        </p>
      )}

      <BucketSummary
        categories={expenseCategories}
        accountId={accountId}
        year={year}
        month={month}
      />

      <CategorySection
        title="הוצאות"
        categories={expenseCategories}
        type="expense"
        accountId={accountId}
        year={year}
        month={month}
      />

      <TransactionTable
        transactions={txWithNames}
        categories={cats}
        accountId={accountId}
        year={year}
        month={month}
      />
    </div>
  )
}
