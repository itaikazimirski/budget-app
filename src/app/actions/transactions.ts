'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertAccountAccess } from '@/lib/assertAccountAccess'
import { validateAmount, validateEnum, validateUuid } from '@/lib/validate'
import { logAudit } from '@/lib/auditLog'

export async function addTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const accountId = validateUuid(formData.get('accountId'))
  if (!accountId) return { error: 'Invalid account' }

  const categoryId = validateUuid(formData.get('categoryId')) ?? null
  const amount = validateAmount(formData.get('amount'))
  if (amount === null || amount <= 0) return { error: 'Invalid amount' }

  const type = validateEnum<'income' | 'expense'>(formData.get('type'), ['income', 'expense'])
  if (!type) return { error: 'Invalid type' }

  const date = formData.get('date') as string
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Invalid date' }

  const rawNotes = formData.get('notes')
  const notes = typeof rawNotes === 'string' && rawNotes.trim().length > 0
    ? rawNotes.trim().slice(0, 500)
    : null

  try { await assertAccountAccess(supabase, user.id, accountId) }
  catch { return { error: 'Access denied' } }

  const { data: newTx, error } = await supabase.from('transactions').insert({
    account_id: accountId,
    category_id: categoryId,
    user_id: user.id,
    amount,
    type,
    date,
    notes,
  }).select('id, account_id, category_id, user_id, amount, type, date, notes, created_at').single()

  if (error) return { error: error.message }

  logAudit(supabase, {
    account_id: accountId, user_id: user.id, action: 'transaction.create',
    entity_id: newTx.id,
    metadata: { amount, type, date, category_id: categoryId },
  })

  const [year, month] = date.split('-')
  revalidatePath(`/${accountId}/${year}/${parseInt(month)}`)
  return { success: true, transaction: newTx }
}

export async function updateTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const transactionId = validateUuid(formData.get('transactionId'))
  const accountId = validateUuid(formData.get('accountId'))
  if (!transactionId || !accountId) return { error: 'Invalid input' }

  const categoryId = validateUuid(formData.get('categoryId')) ?? null
  const amount = validateAmount(formData.get('amount'))
  if (amount === null || amount <= 0) return { error: 'Invalid amount' }

  const type = validateEnum<'income' | 'expense'>(formData.get('type'), ['income', 'expense'])
  if (!type) return { error: 'Invalid type' }

  const date = formData.get('date') as string
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Invalid date' }

  const rawNotes = formData.get('notes')
  const notes = typeof rawNotes === 'string' && rawNotes.trim().length > 0
    ? rawNotes.trim().slice(0, 500)
    : null

  try { await assertAccountAccess(supabase, user.id, accountId) }
  catch { return { error: 'Access denied' } }

  const { error } = await supabase
    .from('transactions')
    .update({ category_id: categoryId, amount, type, date, notes })
    .eq('id', transactionId)
    .eq('account_id', accountId)

  if (error) return { error: error.message }

  logAudit(supabase, {
    account_id: accountId, user_id: user.id, action: 'transaction.update',
    entity_id: transactionId,
    metadata: { amount, type, date, category_id: categoryId },
  })

  const [year, month] = date.split('-')
  revalidatePath(`/${accountId}/${year}/${parseInt(month)}`)
  return { success: true }
}

export async function deleteTransaction(transactionId: string, accountId: string, year: number, month: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!validateUuid(transactionId) || !validateUuid(accountId)) return { error: 'Invalid input' }

  try { await assertAccountAccess(supabase, user.id, accountId) }
  catch { return { error: 'Access denied' } }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('account_id', accountId)

  if (error) return { error: error.message }

  logAudit(supabase, {
    account_id: accountId, user_id: user.id, action: 'transaction.delete',
    entity_id: transactionId,
  })

  revalidatePath(`/${accountId}/${year}/${month}`)
  return { success: true }
}
