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

    return NextResponse.json({ success: true, message: `${type} of ₪${amount} logged successfully.` })
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

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, type')
    .eq('account_id', keyRecord.account_id)
    .order('name')

  return NextResponse.json({ categories: categories ?? [] })
}
