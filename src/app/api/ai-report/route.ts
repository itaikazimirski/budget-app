import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { AIReportData } from '@/lib/types'

const SYSTEM_PROMPT = `אתה יועץ פיננסי אישי שמנתח את תקציב החודש של משפחה ישראלית.

החזר אובייקט JSON בדיוק במבנה הבא:

{
  "mood": אמוג'י אחד בלבד שמבטא את האווירה הפיננסית של החודש (לדוגמה: 🤩 לחודש מעולה, 🙂 לטוב, 😐 לבינוני, 😕 לדאגה קלה, 😟 לבעיה משמעותית),
  "tldr": סיכום קצר של 1-2 משפטים בעברית ישראלית טבעית ואנושית,
  "highlights": מערך של עד 3 תצפיות חיוביות, כל אחת עם:
    - "title": כותרת קצרה בעברית (3-5 מילים)
    - "description": משפט אחד בעברית שמסביר את ההישג
    - "emoji": אמוג'י אחד רלוונטי
  "warnings": מערך של עד 3 דאגות, כל אחת עם:
    - "category": שם הקטגוריה בעברית
    - "issue": משפט אחד בעברית שמתאר את הבעיה
    - "impact": אחד מ "high", "medium", "low"
  "actionItem": המלצה אחת קונקרטית לחודש הבא, בעברית,
  "categorySummary": מערך של סיכום ברמת קבוצות ההוצאה הראשיות (כגון הוצאות קבועות, מזון, תחבורה וכו׳), כל אחת עם:
    - "groupName": שם הקבוצה בעברית
    - "planned": סכום מתוכנן (מספר)
    - "actual": סכום בפועל (מספר)
    - "remaining": הפרש (planned פחות actual, מספר — שלילי אם חרגנו)
  "expenseDetails": מערך של כל ההוצאות הספציפיות לפי קטגוריה, כל אחת עם:
    - "itemName": שם הקטגוריה בעברית
    - "planned": סכום מתוכנן (מספר)
    - "actual": סכום בפועל (מספר)
    - "remaining": הפרש (planned פחות actual, מספר)
}

כללים חשובים:
- כתוב את כל השדות הטקסטואליים בעברית ישראלית טבעית, אנושית ואמפתית. אל תתרגם מאנגלית — דבר כמו יועץ שמכיר את המשפחה
- היה ספציפי — הזכר שמות קטגוריות וסכומים מהנתונים
- ב-categorySummary אל תכלול יותר מ-6 קבוצות — אחד אותן לפי נושא
- ב-expenseDetails כלול רק קטגוריות שיש להן הוצאה בפועל או תקציב מתוכנן
- החזר JSON בלבד, ללא markdown, ללא הסברים`

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

  // Return cached report if it exists
  const { data: existing } = await supabase
    .from('ai_reports')
    .select('content')
    .eq('account_id', accountId)
    .eq('year', year)
    .eq('month', month)
    .single()

  if (existing) return NextResponse.json({ content: existing.content })

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear  = month === 1 ? year - 1 : year
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate   = new Date(year, month, 0).toISOString().split('T')[0]
  const prevStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
  const prevEnd   = new Date(prevYear, prevMonth, 0).toISOString().split('T')[0]

  // Fetch all data in parallel
  const [
    { data: categories },
    { data: categoryGroups },
    { data: templates },
    { data: monthOverrides },
    { data: transactions },
    { data: prevTransactions },
  ] = await Promise.all([
    supabase.from('categories').select('id, name, type, group_id').eq('account_id', accountId).eq('is_archived', false),
    supabase.from('category_groups').select('id, name').eq('account_id', accountId),
    supabase.from('budget_templates').select('category_id, monthly_amount').eq('account_id', accountId),
    supabase.from('month_budgets').select('category_id, monthly_amount').eq('account_id', accountId).eq('year', year).eq('month', month),
    supabase.from('transactions').select('amount, type, category_id').eq('account_id', accountId).gte('date', startDate).lte('date', endDate),
    supabase.from('transactions').select('amount, type, category_id').eq('account_id', accountId).gte('date', prevStart).lte('date', prevEnd),
  ])

  const templateMap  = Object.fromEntries((templates ?? []).map((t) => [t.category_id, t.monthly_amount]))
  const overrideMap  = Object.fromEntries((monthOverrides ?? []).map((o) => [o.category_id, o.monthly_amount]))
  const groupNameMap = Object.fromEntries((categoryGroups ?? []).map((g) => [g.id, g.name]))

  const actualMap: Record<string, number> = {}
  for (const tx of transactions ?? []) {
    if (tx.category_id) actualMap[tx.category_id] = (actualMap[tx.category_id] ?? 0) + tx.amount
  }
  const prevActualMap: Record<string, number> = {}
  for (const tx of prevTransactions ?? []) {
    if (tx.category_id) prevActualMap[tx.category_id] = (prevActualMap[tx.category_id] ?? 0) + tx.amount
  }

  const totalIncome   = (transactions ?? []).filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = (transactions ?? []).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const cats = categories ?? []

  // Per-category detail (for expenseDetails)
  const expenseCats = cats.filter((c) => c.type === 'expense').map((c) => {
    const budget     = overrideMap[c.id] ?? templateMap[c.id] ?? 0
    const actual     = actualMap[c.id] ?? 0
    const prevActual = prevActualMap[c.id] ?? 0
    const groupName  = c.group_id ? (groupNameMap[c.group_id] ?? 'אחר') : 'אחר'
    return { name: c.name, groupName, budget, actual, prevActual }
  }).filter((c) => c.actual > 0 || c.budget > 0)
    .sort((a, b) => b.actual - a.actual)
    .slice(0, 50)

  // Group-level summary (for categorySummary)
  const groupTotals: Record<string, { planned: number; actual: number }> = {}
  for (const c of expenseCats) {
    if (!groupTotals[c.groupName]) groupTotals[c.groupName] = { planned: 0, actual: 0 }
    groupTotals[c.groupName].planned += c.budget
    groupTotals[c.groupName].actual  += c.actual
  }

  const incomeCats = cats.filter((c) => c.type === 'income').map((c) => ({
    name: c.name, actual: actualMap[c.id] ?? 0,
  })).filter((c) => c.actual > 0)

  const dataText = `
חודש: ${monthName(month)} ${year}

סיכום כללי:
- סך הכנסות: ${formatILS(totalIncome)}
- סך הוצאות: ${formatILS(totalExpenses)}
- יתרה (חסכון נטו): ${formatILS(totalIncome - totalExpenses)}

הכנסות לפי קטגוריה:
${incomeCats.map((c) => `- ${c.name}: ${formatILS(c.actual)}`).join('\n')}

סיכום הוצאות לפי קבוצה:
${Object.entries(groupTotals).map(([g, v]) =>
  `- ${g}: תוכנן ${formatILS(v.planned)} / בפועל ${formatILS(v.actual)} / נותר ${formatILS(v.planned - v.actual)}`
).join('\n')}

פירוט הוצאות לפי קטגוריה (תקציב מול בפועל, השוואה לחודש קודם):
${expenseCats.map((c) => {
  const diff     = c.budget > 0 ? Math.round(((c.actual - c.budget) / c.budget) * 100) : null
  const prevDiff = c.prevActual > 0 ? Math.round(((c.actual - c.prevActual) / c.prevActual) * 100) : null
  return `- ${c.name} [${c.groupName}]: בפועל ${formatILS(c.actual)} / תקציב ${formatILS(c.budget)}${diff !== null ? ` (${diff > 0 ? '+' : ''}${diff}%)` : ''}${prevDiff !== null ? ` | חודש קודם: ${prevDiff > 0 ? '+' : ''}${prevDiff}%` : ''}`
}).join('\n')}
`

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })

  let reportData: AIReportData
  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `נתוני החודש:\n${dataText}` }],
    })

    const raw     = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    reportData    = JSON.parse(cleaned) as AIReportData
  } catch (err) {
    console.error('AI REPORT ERROR:', JSON.stringify(err, Object.getOwnPropertyNames(err as object)))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }

  const content = JSON.stringify(reportData)
  await supabase.from('ai_reports').insert({ account_id: accountId, year, month, content })

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
