'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSharedAccount(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = formData.get('name') as string

  const { data: member } = await supabase
    .from('account_members')
    .select('display_name')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const displayName = member?.display_name || user.email || 'משתמש'

  const { data: accountId, error } = await supabase.rpc('create_shared_account', {
    p_user_id: user.id,
    p_display_name: displayName,
    p_name: name,
  })

  if (error) return { error: error.message }

  revalidatePath('/')
  return { success: true, accountId }
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

export async function generateApiKey(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const accountId = formData.get('accountId') as string

  const { data: key, error } = await supabase.rpc('generate_api_key', {
    p_user_id: user.id,
    p_account_id: accountId,
  })

  if (error) return { error: error.message }

  revalidatePath(`/${accountId}/settings`)
  return { success: true, key }
}

export async function deleteApiKey(keyId: string, accountId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Delete only if the key belongs to this account and was created by this user
  await supabase.from('api_keys').delete().eq('id', keyId).eq('account_id', accountId).eq('user_id', user.id)

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
