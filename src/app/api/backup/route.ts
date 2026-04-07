import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

const TABLES = [
  'accounts',
  'account_members',
  'categories',
  'budget_templates',
  'month_budgets',
  'transactions',
]

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

  // Get existing sheet tabs
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const existingTabs = spreadsheet.data.sheets?.map(s => s.properties?.title) ?? []

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select('*')
    if (error || !data || data.length === 0) continue

    const headers = Object.keys(data[0])
    const rows = data.map(row => headers.map(h => String(row[h] ?? '')))

    // Create tab if it doesn't exist
    if (!existingTabs.includes(table)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [{ addSheet: { properties: { title: table } } }],
        },
      })
    }

    // Write data — first row is timestamp, second is headers, rest is data
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

    backed_up.push(table)
  }

  return NextResponse.json({ success: true, timestamp, backed_up })
}
