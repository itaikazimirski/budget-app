'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { validateEmail, validateName } from '@/lib/validate'

export async function login(_: unknown, formData: FormData) {
  const supabase = await createClient()

  const email = validateEmail(formData.get('email'))
  if (!email) return { error: 'Invalid email address' }

  const password = formData.get('password') as string
  if (typeof password !== 'string' || password.length < 6 || password.length > 256) {
    return { error: 'Invalid password' }
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }

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

  const email = validateEmail(formData.get('email'))
  if (!email) return { error: 'Invalid email address' }

  const password = formData.get('password') as string
  if (typeof password !== 'string' || password.length < 6 || password.length > 256) {
    return { error: 'Password must be at least 6 characters' }
  }

  const displayName = validateName(formData.get('displayName'), 60) ?? email.split('@')[0]

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })

  if (error) return { error: error.message }

  if (data.user) {
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
