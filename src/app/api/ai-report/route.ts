import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { AIReportData } from '@/lib/types'

const SYSTEM_PROMPT = `אתה חבר טוב שמבין כלכלה — לא רואה חשבון קר, לא יועץ רשמי. אתה יושב עם משפחה ישראלית, שותה קפה, ומסתכל ביחד איתם על החודש שעבר. הגישה שלך: חם, אמפתי, ישיר, ולא שיפוטי בשום מצב.

החזר אובייקט JSON בדיוק במבנה הבא:

{
  "mood": אמוג'י אחד בלבד שמבטא את האווירה הפיננסית של החודש (לדוגמה: 🤩 לחודש מעולה, 🙂 לטוב, 😐 לבינוני, 😕 לחודש מאתגר, 😟 לחודש קשה),
  "tldr": סיכום של 1-2 משפטים — כאילו אתה מספר לחבר בוואטסאפ מה היה בחודש. קצר, אנושי, בגובה העיניים,
  "highlights": מערך של עד 3 דברים חיוביים שקרו החודש, כל אחד עם:
    - "title": כותרת קצרה (3-5 מילים), לא פורמלית — כמו "שמרתם על הקפה!" ולא "חיסכון בקפה"
    - "description": משפט אחד שמסביר מה קרה ולמה זה נחמד — בגובה העיניים
    - "emoji": אמוג'י אחד רלוונטי
  "warnings": מערך של עד 3 דברים שכדאי לשים אליהם לב, כל אחד עם:
    - "category": שם הקטגוריה
    - "issue": משפט אחד שמסביר מה קרה — בלי האשמות, בנוסח "שים לב ש..." או "נראה שהיתה חריגה קלה ב..."
    - "impact": אחד מ "high", "medium", "low"
  "actionItem": מחשבה קטנה אחת להמשך — לא פקודה, אלא הצעה חמה. לדוגמה: "שווה לבדוק אם אפשר להוריד קצת את ההוצאה על X — לפעמים שינוי קטן עושה הבדל גדול.",
  "categorySummary": מערך של קבוצות הוצאה. כל קבוצה מכילה:
    - "groupName": שם הקבוצה (בדיוק כפי שמופיע בנתונים)
    - "categories": מערך של הקטגוריות בתוך הקבוצה, כל אחת עם:
        - "itemName": שם הקטגוריה
        - "planned": סכום מתוכנן (מספר)
        - "actual": סכום בפועל (מספר)
  "expenseDetails": מערך של כל ההוצאות לפי קטגוריה, כל אחת עם:
    - "itemName": שם הקטגוריה
    - "planned": סכום מתוכנן (מספר)
    - "actual": סכום בפועל (מספר)
    - "remaining": planned פחות actual (מספר, שלילי אם חרגנו)
}

כללי הטון — חובה לקרוא:
- דבר כמו חבר שמכיר אותם — השתמש ב"בינינו", "אל דאגה", "שווה לשים לב", "בוא נראה איך משפרים", "חשוב לזכור", "זה קורה"
- גם בחודש גרוע — אל תגיד "קשה" או "חייבים לתקן מהר". במקום זה: "זה היה חודש קצת מאתגר, אבל בוא נראה איך מייצבים את הספינה יחד"
- אל תאשים ואל תשפוט — גם אם הוצאו הרבה, הטון הוא "זה קורה לכולם, הנה איך אפשר לדייק"
- אסור להשתמש במילה "חסרון" — תמיד "פער" או "חריגה קלה"
- אסור להשתמש ב"נקודות לשיפור" — תמיד "דברים שכדאי לשים לב אליהם"
- אסור להשתמש ב"הצעד הבא" — תמיד "מחשבה קטנה להמשך"
- אסור: "קנוניות", "לתיקום", "בר קיימא", "מיטוב", "אופטימיזציה", "סינרגיה", "מדרגי", "מניפה"
- מותר ורצוי: "עקביות", "משמעת עצמית", "שינוי מגמה", "מעקב", "דיוק", "לאט לאט"

כללי תוכן:
- היה ספציפי — ציין שמות קטגוריות וסכומים מהנתונים
- השקעות (קטגוריות עם [השקעה/חיסכון]): אל תציג אותן כבעיה בכל מצב. תמיד שבח עליהן ב-highlights בחום: "איזה יופי שגם בחודש כזה מצאת דרך להשקיע בעתיד שלך" או "כל שקל שהפנית להשקעות עכשיו עובד בשבילך אחר כך"
- אם יש השקעות, ה-tldr יציין את התזרים התפעולי (ללא ההשקעות) ואת הסכום שהופנה להשקעות בנפרד — בנוסח חם ולא יבש
- ב-categorySummary: כלול את כל הקבוצות מהנתונים עם הקטגוריות שלהן
- ב-expenseDetails: כלול רק קטגוריות עם הוצאה בפועל או תקציב מתוכנן
- החזר JSON בלבד — ללא markdown, ללא הסברים, ללא טקסט לפני ואחרי
- אסור בהחלט לכלול מילים באנגלית בשדות הטקסט (tldr, title, description, groupName, itemName, category, issue, actionItem) — עברית בלבד
- CRITICAL: Your entire response must be a single valid JSON object. It must start with '{' and end with '}'. No greeting, no explanation, no text of any kind outside the JSON.`

function formatILS(amount: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

function monthName(month: number) {
  const names = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
  return names[month - 1]
}

/** Extracts the first complete JSON object from a string that may contain surrounding text or markdown fences. */
function extractJSON(raw: string): unknown {
  // Strip markdown fences first
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  // Find the outermost { ... } block
  const start = stripped.indexOf('{')
  const end   = stripped.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new SyntaxError(`No JSON object found in AI response. Raw (first 300 chars): ${raw.slice(0, 300)}`)
  }
  return JSON.parse(stripped.slice(start, end + 1))
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
    supabase.from('categories').select('id, name, type, group_id, is_investment').eq('account_id', accountId).eq('is_archived', false),
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
    const budget      = overrideMap[c.id] ?? templateMap[c.id] ?? 0
    const actual      = actualMap[c.id] ?? 0
    const prevActual  = prevActualMap[c.id] ?? 0
    const groupName   = c.group_id ? (groupNameMap[c.group_id] ?? 'אחר') : 'אחר'
    const isInvestment = (c as { is_investment?: boolean }).is_investment ?? false
    return { name: c.name, groupName, budget, actual, prevActual, isInvestment }
  }).filter((c) => c.actual > 0 || c.budget > 0)
    .sort((a, b) => b.actual - a.actual)
    .slice(0, 50)

  const totalInvestments = expenseCats
    .filter((c) => c.isInvestment)
    .reduce((s, c) => s + c.actual, 0)
  const operationalExpenses = totalExpenses - totalInvestments

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
- סך הוצאות (כולל הכל): ${formatILS(totalExpenses)}
${totalInvestments > 0 ? `- מתוכן הוצאות תפעוליות (ללא השקעות): ${formatILS(operationalExpenses)}
- סך הופנה להשקעות/חיסכון: ${formatILS(totalInvestments)}` : ''}
- תזרים תפעולי נטו: ${formatILS(totalIncome - operationalExpenses)}

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
  const investTag = c.isInvestment ? ' [השקעה/חיסכון]' : ''
  return `- ${c.name} [${c.groupName}]${investTag}: בפועל ${formatILS(c.actual)} / תקציב ${formatILS(c.budget)}${diff !== null ? ` (${diff > 0 ? '+' : ''}${diff}%)` : ''}${prevDiff !== null ? ` | חודש קודם: ${prevDiff > 0 ? '+' : ''}${prevDiff}%` : ''}`
}).join('\n')}
`

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })

  let reportData: AIReportData
  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `נתוני החודש:\n${dataText}` }],
    })

    const raw     = message.content[0].type === 'text' ? message.content[0].text : ''
    reportData    = extractJSON(raw) as AIReportData
    // Inject server-computed investment total so clients don't need to re-fetch categories
    if (totalInvestments > 0) reportData.totalInvestments = totalInvestments
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
