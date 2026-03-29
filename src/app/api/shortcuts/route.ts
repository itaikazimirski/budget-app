import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

// POST /api/shortcuts
// Body: { api_key, amount, type, category_name, date?, notes? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { api_key, amount, type, category_name, date, notes } = body

    if (!api_key) return NextResponse.json({ error: 'Missing api_key' }, { status: 401 })
    if (!amount || !type) return NextResponse.json({ error: 'Missing amount or type' }, { status: 400 })

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )

    // Look up the API key via SECURITY DEFINER function (bypasses RLS)
    const { data: keyRows } = await supabase.rpc('lookup_api_key', { p_key_value: api_key })
    const keyRecord = keyRows?.[0]

    if (!keyRecord) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })

    const { user_id, account_id } = keyRecord

    const { data: result } = await supabase.rpc('add_shortcut_transaction', {
      p_account_id: account_id,
      p_user_id: user_id,
      p_amount: parseFloat(String(amount)),
      p_type: type,
      p_category_name: category_name ?? null,
      p_date: date ?? null,
      p_notes: notes ?? null,
    })

    if (result?.error) return NextResponse.json({ error: result.error }, { status: 500 })

    // Check budget percentage for the category
    let budgetAlert = false
    let percentage = 0
    if (category_name && type === 'expense') {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const { data: budgetData } = await supabase.rpc('get_category_budget_percentage', {
        p_account_id: account_id,
        p_category_name: category_name,
        p_year: year,
        p_month: month,
      })
      const row = budgetData?.[0]
      if (row && row.budget > 0) {
        percentage = Math.round(row.percentage)
        budgetAlert = percentage >= 80
      }
    }

    const message = budgetAlert
      ? `✅ ההוצאה נרשמה! ⚠️ הגעת ל-${percentage}% מתקציב "${category_name}"`
      : `✅ ההוצאה נרשמה בהצלחה`

    return NextResponse.json({ success: true, message, budget_percentage: percentage, budget_alert: budgetAlert })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

// GET /api/shortcuts/categories — returns categories for the account (for Shortcut menus)
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key') ?? request.nextUrl.searchParams.get('api_key')

  if (!apiKey) return NextResponse.json({ error: 'Missing api_key' }, { status: 401 })

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: keyRows } = await supabase.rpc('lookup_api_key', { p_key_value: apiKey })
  const keyRecord = keyRows?.[0]

  if (!keyRecord) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })

  const typeFilter = request.nextUrl.searchParams.get('type')
  const namesOnly = request.nextUrl.searchParams.get('names') === 'true'

  if (namesOnly) {
    const { data: names } = await supabase.rpc('get_shortcut_categories', {
      p_account_id: keyRecord.account_id,
      p_type: typeFilter ?? null,
    })
    return NextResponse.json(names ?? [])
  }

  const { data: names } = await supabase.rpc('get_shortcut_categories', {
    p_account_id: keyRecord.account_id,
    p_type: typeFilter ?? null,
  })
  return NextResponse.json({ categories: (names ?? []).map((name: string) => ({ name })) })
}
