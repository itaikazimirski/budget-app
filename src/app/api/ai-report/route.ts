import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AIReportData } from '@/lib/types'

const SYSTEM_PROMPT = `You are a personal finance advisor analyzing a monthly budget for an Israeli household.
Analyze the budget data and return a JSON object with the following structure:

{
  "score": one of "A", "B", "C", "D", or "F" — overall monthly financial grade,
  "tldr": a 1-2 sentence plain Hebrew summary of the month (direct, no fluff),
  "highlights": array of up to 3 positive observations, each with:
    - "title": short Hebrew label (3-5 words)
    - "description": one Hebrew sentence explaining the highlight
    - "emoji": a single relevant emoji
  "warnings": array of up to 3 concerns, each with:
    - "category": the category name in Hebrew
    - "issue": one Hebrew sentence describing the problem
    - "impact": one of "high", "medium", or "low"
  "actionItem": a single concrete Hebrew recommendation for next month
}

Rules:
- Write all text fields in Hebrew
- Be direct and specific — reference actual category names and amounts from the data
- Score reflects overall savings rate and budget adherence: A = excellent, B = good, C = acceptable, D = concerning, F = critical
- Return ONLY the JSON object, no markdown, no explanation`

function formatILS(amount: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

function monthName(month: number) {
  const names = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
  return names[month - 1]
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { accountId, year, month } = await req.json()
  if (!accountId || !year || !month) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  // Check if report already exists
  const { data: existing } = await supabase
    .from('ai_reports')
    .select('content')
    .eq('account_id', accountId)
    .eq('year', year)
    .eq('month', month)
    .single()

  if (existing) return NextResponse.json({ content: existing.content })

  // Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, type, icon, bucket')
    .eq('account_id', accountId)
    .eq('is_archived', false)

  // Fetch budget templates
  const { data: templates } = await supabase
    .from('budget_templates')
    .select('category_id, monthly_amount')
    .eq('account_id', accountId)

  // Fetch monthly overrides
  const { data: monthOverrides } = await supabase
    .from('month_budgets')
    .select('category_id, monthly_amount')
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

  // Fetch previous month transactions for comparison
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const prevStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
  const prevEnd = new Date(prevYear, prevMonth, 0).toISOString().split('T')[0]

  const { data: prevTransactions } = await supabase
    .from('transactions')
    .select('*, category:categories(*)')
    .eq('account_id', accountId)
    .gte('date', prevStart)
    .lte('date', prevEnd)

  // Build actuals
  const templateMap = Object.fromEntries((templates ?? []).map((t) => [t.category_id, t.monthly_amount]))
  const overrideMap = Object.fromEntries((monthOverrides ?? []).map((o) => [o.category_id, o.monthly_amount]))

  const actualMap: Record<string, number> = {}
  for (const tx of transactions ?? []) {
    if (tx.category_id) actualMap[tx.category_id] = (actualMap[tx.category_id] ?? 0) + tx.amount
  }

  const prevActualMap: Record<string, number> = {}
  for (const tx of prevTransactions ?? []) {
    if (tx.category_id) prevActualMap[tx.category_id] = (prevActualMap[tx.category_id] ?? 0) + tx.amount
  }

  const totalIncome = (transactions ?? []).filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = (transactions ?? []).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalSaved = totalIncome - totalExpenses

  // Build category summary
  const cats = categories ?? []
  const expenseCats = cats.filter((c) => c.type === 'expense').map((c) => {
    const budget = overrideMap[c.id] ?? templateMap[c.id] ?? 0
    const actual = actualMap[c.id] ?? 0
    const prevActual = prevActualMap[c.id] ?? 0
    return { name: c.name, icon: c.icon, bucket: c.bucket, budget, actual, prevActual }
  }).filter((c) => c.actual > 0 || c.budget > 0)

  const incomeCats = cats.filter((c) => c.type === 'income').map((c) => {
    const actual = actualMap[c.id] ?? 0
    return { name: c.name, actual }
  }).filter((c) => c.actual > 0)

  // Build data string for Gemini
  const dataText = `
חודש: ${monthName(month)} ${year}

סיכום כללי:
- סך הכנסות: ${formatILS(totalIncome)}
- סך הוצאות: ${formatILS(totalExpenses)}
- יתרה (חסכון נטו): ${formatILS(totalSaved)}

הכנסות לפי קטגוריה:
${incomeCats.map((c) => `- ${c.name}: ${formatILS(c.actual)}`).join('\n')}

הוצאות לפי קטגוריה (תקציב מול בפועל, והשוואה לחודש הקודם):
${expenseCats.map((c) => {
  const diff = c.budget > 0 ? Math.round(((c.actual - c.budget) / c.budget) * 100) : null
  const prevDiff = c.prevActual > 0 ? Math.round(((c.actual - c.prevActual) / c.prevActual) * 100) : null
  return `- ${c.icon} ${c.name}: בפועל ${formatILS(c.actual)} מתוך תקציב ${formatILS(c.budget)}${diff !== null ? ` (${diff > 0 ? '+' : ''}${diff}% מהתקציב)` : ''}${prevDiff !== null ? ` | לעומת ${monthName(prevMonth)}: ${prevDiff > 0 ? '+' : ''}${prevDiff}%` : ''}`
}).join('\n')}
`

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 })

  let reportData: AIReportData
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nהנה נתוני החודש:\n${dataText}` }] }],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      }
    )
    const json = await res.json()
    if (!res.ok) return NextResponse.json({ error: 'שגיאת ג\'מיני: ' + JSON.stringify(json) }, { status: 500 })
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    reportData = JSON.parse(raw) as AIReportData
  } catch (err) {
    return NextResponse.json({ error: 'שגיאת ג\'מיני: ' + String(err) }, { status: 500 })
  }

  const content = JSON.stringify(reportData)

  // Save to DB
  await supabase.from('ai_reports').insert({
    account_id: accountId,
    year,
    month,
    content,
  })

  return NextResponse.json({ content })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')

  if (!accountId) return NextResponse.json({ error: 'Missing accountId' }, { status: 400 })

  const { data } = await supabase
    .from('ai_reports')
    .select('year, month, created_at')
    .eq('account_id', accountId)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  return NextResponse.json({ reports: data ?? [] })
}
