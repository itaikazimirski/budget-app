import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM_PROMPT = `אתה יועץ פיננסי אישי, חד וחכם. המשתמש מולך מבין בפיננסים, אז דבר אליו ישירות, בגובה העיניים ובלי קלישאות. המטרה שלך היא לנתח את תקציב החודש החולף. אל תחזור סתם על מספרים, אלא הפק תובנות:

חפש מגמות או חריגות נקודתיות (למשל: "ההוצאות על פובי קפצו החודש משמעותית", או "יש חריגה קבועה בתקציב המסעדות").

עקוב והתייחס להתקדמות ביעדי חיסכון גדולים (למשל: "בקצב הנוכחי, עמדת ביעד החיסכון החודשי לקראת מעבר דירה למרכז").

תן חיזוקים חיוביים על ניהול תזרים נכון והצעות חכמות מה לעשות עם עודפים שנוצרו.

כתוב את הדוח בעברית, בפסקאות קצרות וקריאות. אל תשתמש בכותרות גדולות — כתוב כמו שיחה עם יועץ, לא כמו מצגת.`

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
    .select('*')
    .eq('account_id', accountId)

  // Fetch budget templates
  const { data: templates } = await supabase
    .from('budget_templates')
    .select('*')
    .eq('account_id', accountId)

  // Fetch monthly overrides
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

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })

  let result
  try {
    result = await model.generateContent(`${SYSTEM_PROMPT}\n\nהנה נתוני החודש:\n${dataText}`)
  } catch (err) {
    return NextResponse.json({ error: 'שגיאת ג\'מיני: ' + String(err) }, { status: 500 })
  }
  const content = result.response.text()

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
