'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSharedAccount(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = formData.get('name') as string

  const { data: account, error } = await supabase
    .from('accounts')
    .insert({ name, type: 'shared', created_by: user.id })
    .select()
    .single()

  if (error) return { error: error.message }

  // Get user's display name
  const { data: member } = await supabase
    .from('account_members')
    .select('display_name')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  await supabase.from('account_members').insert({
    account_id: account.id,
    user_id: user.id,
    display_name: member?.display_name || user.email,
  })

  revalidatePath('/')
  return { success: true, accountId: account.id }
}

export async function inviteMember(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const accountId = formData.get('accountId') as string
  const email = formData.get('email') as string

  // Find user by email - requires a function or admin access
  // For simplicity, we look up the user in auth.users via RPC
  const { data: targetUser, error: lookupError } = await supabase
    .rpc('get_user_id_by_email', { user_email: email })

  if (lookupError || !targetUser) {
    return { error: 'User not found. Make sure they have signed up first.' }
  }

  const { error } = await supabase.from('account_members').insert({
    account_id: accountId,
    user_id: targetUser,
    display_name: email.split('@')[0],
  })

  if (error) {
    if (error.code === '23505') return { error: 'This user is already a member.' }
    return { error: error.message }
  }

  revalidatePath(`/${accountId}/settings`)
  return { success: true }
}

export async function updateAccountName(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const accountId = formData.get('accountId') as string
  const name = formData.get('name') as string

  const { error } = await supabase
    .from('accounts')
    .update({ name })
    .eq('id', accountId)
    .eq('created_by', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/${accountId}/settings`)
  return { success: true }
}
