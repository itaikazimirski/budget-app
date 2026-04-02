'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const accountId = formData.get('accountId') as string
  const categoryId = formData.get('categoryId') as string || null
  const amount = parseFloat(formData.get('amount') as string)
  const type = formData.get('type') as 'income' | 'expense'
  const date = formData.get('date') as string
  const notes = formData.get('notes') as string || null

  if (isNaN(amount) || amount <= 0) return { error: 'Invalid amount' }

  const { data: newTx, error } = await supabase.from('transactions').insert({
    account_id: accountId,
    category_id: categoryId,
    user_id: user.id,
    amount,
    type,
    date,
    notes,
  }).select('*').single()

  if (error) return { error: error.message }

  const [year, month] = date.split('-')
  revalidatePath(`/${accountId}/${year}/${parseInt(month)}`)
  return { success: true, transaction: newTx }
}

export async function updateTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const transactionId = formData.get('transactionId') as string
  const accountId = formData.get('accountId') as string
  const categoryId = formData.get('categoryId') as string || null
  const amount = parseFloat(formData.get('amount') as string)
  const type = formData.get('type') as 'income' | 'expense'
  const date = formData.get('date') as string
  const notes = formData.get('notes') as string || null

  if (isNaN(amount) || amount <= 0) return { error: 'Invalid amount' }

  const { error } = await supabase
    .from('transactions')
    .update({ category_id: categoryId, amount, type, date, notes })
    .eq('id', transactionId)

  if (error) return { error: error.message }

  const [year, month] = date.split('-')
  revalidatePath(`/${accountId}/${year}/${parseInt(month)}`)
  return { success: true }
}

export async function deleteTransaction(transactionId: string, accountId: string, year: number, month: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('transactions').delete().eq('id', transactionId)

  if (error) return { error: error.message }

  revalidatePath(`/${accountId}/${year}/${month}`)
  return { success: true }
}
