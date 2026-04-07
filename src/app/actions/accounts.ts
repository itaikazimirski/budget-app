'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertAccountAccess } from '@/lib/assertAccountAccess'
import { validateName, validateEmail, validateUuid } from '@/lib/validate'
import { logAudit } from '@/lib/auditLog'

export async function createSharedAccount(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = validateName(formData.get('name'))
  if (!name) return { error: 'Invalid account name' }

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

  const accountId = validateUuid(formData.get('accountId'))
  if (!accountId) return { error: 'Invalid account' }

  try { await assertAccountAccess(supabase, user.id, accountId) }
  catch { return { error: 'Access denied' } }

  const email = validateEmail(formData.get('email'))
  if (!email) return { error: 'Invalid email address' }

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

  logAudit(supabase, {
    account_id: accountId, user_id: user.id, action: 'member.invite',
  })

  revalidatePath(`/${accountId}/settings`)
  return { success: true }
}

export async function generateApiKey(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const accountId = validateUuid(formData.get('accountId'))
  if (!accountId) return { error: 'Invalid account' }

  try { await assertAccountAccess(supabase, user.id, accountId) }
  catch { return { error: 'Access denied' } }

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

  if (!validateUuid(keyId) || !validateUuid(accountId)) return { error: 'Invalid input' }

  await supabase.from('api_keys').delete().eq('id', keyId).eq('account_id', accountId).eq('user_id', user.id)

  revalidatePath(`/${accountId}/settings`)
  return { success: true }
}

export async function updateAccountName(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const accountId = validateUuid(formData.get('accountId'))
  if (!accountId) return { error: 'Invalid account' }

  const name = validateName(formData.get('name'))
  if (!name) return { error: 'Invalid account name' }

  const { error } = await supabase
    .from('accounts')
    .update({ name })
    .eq('id', accountId)
    .eq('created_by', user.id)

  if (error) return { error: error.message }

  logAudit(supabase, {
    account_id: accountId, user_id: user.id, action: 'account.rename',
    metadata: { name },
  })

  revalidatePath(`/${accountId}/settings`)
  return { success: true }
}
