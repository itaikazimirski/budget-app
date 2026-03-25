import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppNav from '@/components/layout/AppNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch all accounts the user belongs to
  const { data: memberships } = await supabase
    .from('account_members')
    .select('account_id, display_name, accounts!inner(id, name, type)')
    .eq('user_id', user.id)

  const accounts = (memberships ?? []).map((m) => {
    const acc = (m.accounts as unknown) as { id: string; name: string; type: string }
    return { id: acc.id, name: acc.name, type: acc.type }
  })

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <AppNav accounts={accounts} userEmail={user.email ?? ''} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
