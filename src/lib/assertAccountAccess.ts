import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Verifies that the authenticated user is a member of the given account.
 * Throws if access is denied — call at the top of any server action that
 * receives an accountId from the client.
 */
export async function assertAccountAccess(
  supabase: SupabaseClient,
  userId: string,
  accountId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('account_members')
    .select('account_id')
    .eq('account_id', accountId)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    throw new Error('Access denied: user is not a member of this account')
  }
}
