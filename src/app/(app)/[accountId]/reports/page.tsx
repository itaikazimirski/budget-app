import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MONTH_NAMES } from '@/lib/types'
import Link from 'next/link'
import { Sparkles, ArrowRight, FileText } from 'lucide-react'
import ReportViewer from '@/components/budget/ReportViewer'

export default async function ReportsPage({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('account_members')
    .select('display_name')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .single()
  if (!membership) redirect('/')

  const { data: reports } = await supabase
    .from('ai_reports')
    .select('year, month, created_at, content')
    .eq('account_id', accountId)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 dark:bg-indigo-900/60 rounded-xl p-2">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white text-lg">היסטוריית דוחות</h1>
            <p className="text-xs text-slate-400 mt-0.5">ניתוחי בינה מלאכותית לחודשים קודמים</p>
          </div>
        </div>
        <Link
          href={`/${accountId}`}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          חזרה
        </Link>
      </div>

      {!reports || reports.length === 0 ? (
        <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-white/[0.08] px-4 py-12 text-center">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">אין דוחות עדיין.</p>
          <p className="text-slate-300 text-xs mt-1">הדוח הראשון יוצג ב-1 לחודש הבא.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <ReportViewer
              key={`${report.year}-${report.month}`}
              year={report.year}
              month={report.month}
              content={report.content}
              createdAt={report.created_at}
            />
          ))}
        </div>
      )}
    </div>
  )
}
