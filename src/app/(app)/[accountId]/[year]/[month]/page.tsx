import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { CategoryWithStats, MonthlyStats } from '@/lib/types'
import MonthSummary from '@/components/budget/MonthSummary'
import CategorySection from '@/components/budget/CategorySection'
import TransactionTable from '@/components/budget/TransactionTable'
import BucketSummary from '@/components/budget/BucketSummary'
import FixedExpensesButton from '@/components/budget/FixedExpensesButton'
import HouseholdSection from '@/components/budget/HouseholdSection'
import AIReportBanner from '@/components/budget/AIReportBanner'
import { migrateToGroups, fixOrphanCategories } from '@/app/actions/categoryGroups'
import CategoryGroupsGrid from '@/components/budget/CategoryGroupsGrid'

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

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  // Run migration (no-op if already done), then fix any orphaned categories
  await migrateToGroups(accountId)
  await fixOrphanCategories(accountId)

  // Fetch all data in parallel
  const [
    { data: categories },
    { data: templates },
    { data: monthOverrides },
    { data: transactions },
    { data: members },
    { data: categoryGroups },
  ] = await Promise.all([
    supabase.from('categories').select('*').eq('account_id', accountId).order('name'),
    supabase.from('budget_templates').select('*').eq('account_id', accountId),
    supabase.from('month_budgets').select('*').eq('account_id', accountId).eq('year', year).eq('month', month),
    supabase.from('transactions').select('*, category:categories(*)').eq('account_id', accountId).gte('date', startDate).lte('date', endDate).order('date', { ascending: false }),
    supabase.from('account_members').select('user_id, display_name').eq('account_id', accountId),
    supabase.from('category_groups').select('*').eq('account_id', accountId).order('sort_order'),
  ])

  // Auto-insert fixed expense transactions — only run in the first 5 days of the current month
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month
  const isEarlyInMonth = today.getDate() <= 5
  if (isCurrentMonth && isEarlyInMonth) {
    const fixedCategories = (categories ?? []).filter((c) => c.type === 'expense' && c.is_fixed)
    if (fixedCategories.length > 0) {
      const firstOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
      const templateMap2 = Object.fromEntries((templates ?? []).map((t) => [t.category_id, t.monthly_amount]))
      await Promise.all(fixedCategories.map(async (cat) => {
        const { data: existing } = await supabase
          .from('transactions').select('id').eq('account_id', accountId)
          .eq('category_id', cat.id).eq('date', firstOfMonth).eq('type', 'expense').limit(1)
        if (!existing || existing.length === 0) {
          const amount = templateMap2[cat.id] ?? 0
          if (amount > 0) {
            await supabase.from('transactions').insert({
              account_id: accountId, category_id: cat.id, user_id: user.id,
              amount, type: 'expense', date: firstOfMonth, notes: 'הוצאה קבועה (אוטומטי)',
            })
          }
        }
      }))
    }
  }

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

  // Build stats — filter out one-time categories that don't belong to this month
  const cats = (categories ?? []).filter((c) =>
    c.one_time_year === null ||
    (c.one_time_year === year && c.one_time_month === month)
  )
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

  // Sort groups: group with most is_fixed expense categories comes first (usually 'משק בית')
  const fixedCountByGroup: Record<string, number> = {}
  for (const cat of expenseCategories) {
    if (cat.group_id && cat.is_fixed) {
      fixedCountByGroup[cat.group_id] = (fixedCountByGroup[cat.group_id] ?? 0) + 1
    }
  }
  const sortedGroups = [...(categoryGroups ?? [])].sort((a, b) => {
    const aFixed = fixedCountByGroup[a.id] ?? 0
    const bFixed = fixedCountByGroup[b.id] ?? 0
    if (aFixed !== bFixed) return bFixed - aFixed
    return a.sort_order - b.sort_order
  })

  const hasMonthOverride = (monthOverrides ?? []).length > 0

  // Check if today is the 1st of the month — show banner for previous month
  const isFirstOfMonth = today.getDate() === 1
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  // Show banner if we're on the current month AND today is the 1st
  const showReportBanner = isCurrentMonth && isFirstOfMonth

  // Check if report already exists for previous month
  const { data: existingReport } = await supabase
    .from('ai_reports')
    .select('id')
    .eq('account_id', accountId)
    .eq('year', prevYear)
    .eq('month', prevMonth)
    .single()

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {showReportBanner && (
        <AIReportBanner
          accountId={accountId}
          prevYear={prevYear}
          prevMonth={prevMonth}
          hasExisting={!!existingReport}
        />
      )}

      <MonthSummary stats={stats} accountId={accountId} year={year} month={month} />


      <CategoryGroupsGrid
        groups={sortedGroups}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
        accountId={accountId}
        year={year}
        month={month}
        transactions={txWithNames}
      />

      <FixedExpensesButton categories={expenseCategories} />

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
