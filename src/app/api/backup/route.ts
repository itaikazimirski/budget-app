import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

// Explicit column lists — never dump * blindly.
// Only include what's needed to restore financial data.
// Internal system fields (user_id, created_by, etc.) are excluded.
const BACKUP_COLUMNS: Record<string, string> = {
  accounts:         'id, name, created_at',
  account_members:  'account_id, display_name, created_at',
  categories:       'id, account_id, name, type, icon, bucket, category_group, is_fixed, group_id, one_time_year, one_time_month',
  budget_templates: 'id, account_id, category_id, monthly_amount',
  month_budgets:    'id, account_id, category_id, year, month, monthly_amount',
  transactions:     'id, account_id, category_id, amount, type, date, notes, created_at',
}

const SHEET_ID = process.env.GOOGLE_SHEET_ID!

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const sheets = await getSheetsClient()
  const timestamp = new Date().toISOString()
  const backed_up: string[] = []

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const existingTabs = spreadsheet.data.sheets?.map(s => s.properties?.title) ?? []

  for (const [table, columns] of Object.entries(BACKUP_COLUMNS)) {
    const { data, error } = await supabase.from(table).select(columns)
    if (error || !data || data.length === 0) continue

    const headers = Object.keys(data[0])
    const rows = data.map(row => headers.map(h => String((row as unknown as Record<string, unknown>)[h] ?? '')))

    if (!existingTabs.includes(table)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [{ addSheet: { properties: { title: table } } }],
        },
      })
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${table}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          [`⏱ Last backup: ${timestamp}`, ...Array(headers.length - 1).fill('')],
          headers,
          ...rows,
        ],
      },
    })

    backed_up.push(`${table} (${rows.length} rows)`)
  }

  return NextResponse.json({ success: true, timestamp, backed_up })
}
