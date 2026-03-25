'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(_: unknown, formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }

  // If user has no account yet (e.g. signed up before schema was ready), create one now
  if (data.user) {
    const { data: memberships } = await supabase
      .from('account_members')
      .select('account_id')
      .eq('user_id', data.user.id)
      .limit(1)

    if (!memberships?.length) {
      const displayName =
        data.user.user_metadata?.display_name ?? email.split('@')[0]
      const { error: rpcError } = await supabase.rpc('create_initial_account', {
        p_user_id: data.user.id,
        p_display_name: displayName,
      })
      if (rpcError) return { error: `שגיאה ביצירת חשבון: ${rpcError.message} (${rpcError.code})` }
    }
  }

  redirect('/')
}

export async function signup(_: unknown, formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const displayName = formData.get('displayName') as string

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })

  if (error) return { error: error.message }

  if (data.user) {
    // Create personal account automatically
    await supabase.rpc('create_initial_account', {
      p_user_id: data.user.id,
      p_display_name: displayName,
    })
  }

  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
