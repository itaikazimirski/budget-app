import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TemplateEditor from '@/components/budget/TemplateEditor'

export default async function TemplatePage(props: PageProps<'/[accountId]/template'>) {
  const { accountId } = await props.params
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

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('account_id', accountId)
    .order('name')

  const { data: templates } = await supabase
    .from('budget_templates')
    .select('*')
    .eq('account_id', accountId)

  const templateMap = Object.fromEntries((templates ?? []).map((t) => [t.category_id, t.monthly_amount]))

  const cats = (categories ?? []).map((c) => ({
    ...c,
    monthly_amount: templateMap[c.id] ?? 0,
  }))

  const now = new Date()

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <a
          href={`/${accountId}/${now.getFullYear()}/${now.getMonth() + 1}`}
          className="text-sm text-slate-400 hover:text-slate-600 mb-3 inline-block"
        >
          ← חזרה לחודש הנוכחי
        </a>
        <h1 className="text-xl font-bold text-slate-900">תבנית התקציב החודשי</h1>
        <p className="text-sm text-slate-500 mt-1">
          אלה הסכומים הדיפולטיביים לכל חודש. ניתן לשנות קטגוריה ספציפית בכל חודש בנפרד.
        </p>
      </div>

      <TemplateEditor categories={cats} accountId={accountId} />
    </div>
  )
}
