import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const { data: memberships } = await supabase
    .from('account_members')
    .select('account_id')
    .eq('user_id', user.id)
    .limit(1)

  if (memberships?.length) {
    redirect(`/${memberships[0].account_id}/${year}/${month}`)
  }

  // No account yet — sign out so the proxy doesn't loop, then redirect to login
  await supabase.auth.signOut()
  redirect('/login')
}
