import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from '@/components/layout/SettingsClient'

export default async function SettingsPage(props: PageProps<'/[accountId]/settings'>) {
  const { accountId } = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: account } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .single()

  if (!account) redirect('/')

  const { data: membershipCheck } = await supabase
    .from('account_members')
    .select('display_name')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .single()

  if (!membershipCheck) redirect('/')

  const { data: members } = await supabase
    .from('account_members')
    .select('account_id, user_id, display_name')
    .eq('account_id', accountId)

  const { data: apiKeys } = await supabase
    .from('api_keys')
    .select('id, name, key_value, created_at')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('id, action, entity_id, metadata, created_at, user_id')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: householdCats } = await supabase
    .from('categories')
    .select('id')
    .eq('account_id', accountId)
    .eq('category_group', 'משק בית')
    .limit(1)

  const now = new Date()

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="mb-6">
        <a
          href={`/${accountId}/${now.getFullYear()}/${now.getMonth() + 1}`}
          className="text-sm text-slate-400 hover:text-slate-600 mb-3 inline-block"
        >
          ← חזרה לחודש הנוכחי
        </a>
        <h1 className="text-xl font-bold text-slate-900">הגדרות חשבון</h1>
        <p className="text-sm text-slate-500 mt-1">
          ניהול החשבון והמשתתפים שלך.
        </p>
      </div>

      <SettingsClient
        account={account}
        members={members ?? []}
        isOwner={account.created_by === user.id}
        apiKeys={apiKeys ?? []}
        hasHousehold={(householdCats ?? []).length > 0}
        auditLogs={auditLogs ?? []}
      />
    </div>
  )
}
