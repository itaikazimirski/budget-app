import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  // Fetch everything in parallel
  const prevStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
  const prevEnd = new Date(prevYear, prevMonth, 0).toISOString().split('T')[0]
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  const [
    { data: existing },
    { data: prevTransactions },
    { data: categories },
    { data: templates },
    { data: monthOverrides },
    { data: transactions },
  ] = await Promise.all([
    supabase.from('ai_reports').select('content').eq('account_id', accountId).eq('year', year).eq('month', month).single(),
    supabase.from('transactions').select('category_id, amount, type').eq('account_id', accountId).gte('date', prevStart).lte('date', prevEnd),
    supabase.from('categories').select('id, account_id, name, type, icon, bucket, category_group, is_fixed, one_time_year, one_time_month, group_id').eq('account_id', accountId).eq('is_archived', false),
    supabase.from('budget_templates').select('id, account_id, category_id, monthly_amount').eq('account_id', accountId),
    supabase.from('month_budgets').select('id, account_id, category_id, year, month, monthly_amount').eq('account_id', accountId).eq('year', year).eq('month', month),
    supabase.from('transactions').select('*, category:categories(*)').eq('account_id', accountId).gte('date', startDate).lte('date', endDate),
  ])

  // Build prev month actuals
  const prevActuals: Record<string, number> = {}
  let prevTotalExpenses = 0
  for (const tx of prevTransactions ?? []) {
    if (tx.type === 'expense' && tx.category_id) {
      prevActuals[tx.category_id] = (prevActuals[tx.category_id] ?? 0) + tx.amount
      prevTotalExpenses += tx.amount
    }
  }

  // Return early if AI report already exists
  if (existing) {
    return NextResponse.json({ aiContent: existing.content, prevActuals, prevTotalExpenses })
  }

  // Generate AI report
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 })

  const templateMap = Object.fromEntries((templates ?? []).map((t) => [t.category_id, t.monthly_amount]))
  const overrideMap = Object.fromEntries((monthOverrides ?? []).map((o) => [o.category_id, o.monthly_amount]))
  const actualMap: Record<string, number> = {}
  for (const tx of transactions ?? []) {
    if (tx.category_id) actualMap[tx.category_id] = (actualMap[tx.category_id] ?? 0) + tx.amount
  }

  const totalIncome = (transactions ?? []).filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = (transactions ?? []).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const cats = categories ?? []
  const expenseCats = cats.filter((c) => c.type === 'expense').map((c) => {
    const budget = overrideMap[c.id] ?? templateMap[c.id] ?? 0
    const actual = actualMap[c.id] ?? 0
    const prevActual = prevActuals[c.id] ?? 0
    return { name: c.name, icon: c.icon, budget, actual, prevActual }
  }).filter((c) => c.actual > 0 || c.budget > 0)

  const incomeCats = cats.filter((c) => c.type === 'income').map((c) => ({
    name: c.name, actual: actualMap[c.id] ?? 0
  })).filter((c) => c.actual > 0)

  const dataText = `
חודש: ${monthName(month)} ${year}

סיכום כללי:
- סך הכנסות: ${formatILS(totalIncome)}
- סך הוצאות: ${formatILS(totalExpenses)}
- יתרה (חסכון נטו): ${formatILS(totalIncome - totalExpenses)}

הכנסות לפי קטגוריה:
${incomeCats.map((c) => `- ${c.name}: ${formatILS(c.actual)}`).join('\n')}

הוצאות לפי קטגוריה (תקציב מול בפועל, והשוואה לחודש הקודם):
${expenseCats.map((c) => {
  const diff = c.budget > 0 ? Math.round(((c.actual - c.budget) / c.budget) * 100) : null
  const prevDiff = c.prevActual > 0 ? Math.round(((c.actual - c.prevActual) / c.prevActual) * 100) : null
  return `- ${c.icon} ${c.name}: בפועל ${formatILS(c.actual)} מתוך תקציב ${formatILS(c.budget)}${diff !== null ? ` (${diff > 0 ? '+' : ''}${diff}% מהתקציב)` : ''}${prevDiff !== null ? ` | לעומת ${monthName(prevMonth)}: ${prevDiff > 0 ? '+' : ''}${prevDiff}%` : ''}`
}).join('\n')}
`

  let aiContent: string
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nהנה נתוני החודש:\n${dataText}` }] }],
        }),
      }
    )
    const json = await res.json()
    if (!res.ok) return NextResponse.json({ error: 'שגיאת ג\'מיני: ' + JSON.stringify(json) }, { status: 500 })
    aiContent = json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  } catch (err) {
    return NextResponse.json({ error: 'שגיאת ג\'מיני: ' + String(err) }, { status: 500 })
  }

  // Save AI report
  await supabase.from('ai_reports').insert({ account_id: accountId, year, month, content: aiContent })

  return NextResponse.json({ aiContent, prevActuals, prevTotalExpenses })
}
