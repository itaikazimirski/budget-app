'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CategoryType } from '@/lib/types'

export async function addCategory(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const accountId = formData.get('accountId') as string
  const name = formData.get('name') as string
  const type = formData.get('type') as CategoryType
  const icon = formData.get('icon') as string || '📦'
  const bucket = formData.get('bucket') as string || null
  const category_group = formData.get('category_group') as string || null
  const is_fixed = formData.get('is_fixed') === 'true'
  const monthlyAmount = parseFloat(formData.get('monthlyAmount') as string) || 0

  const { data: category, error } = await supabase
    .from('categories')
    .insert({ account_id: accountId, name, type, icon, bucket, category_group, is_fixed })
    .select()
    .single()

  if (error) return { error: error.message }

  // Add to budget template
  await supabase.from('budget_templates').insert({
    account_id: accountId,
    category_id: category.id,
    monthly_amount: monthlyAmount,
  })

  revalidatePath(`/${accountId}`)
  return { success: true }
}

export async function updateCategory(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const categoryId = formData.get('categoryId') as string
  const accountId = formData.get('accountId') as string
  const name = formData.get('name') as string
  const icon = formData.get('icon') as string || '📦'
  const bucket = formData.get('bucket') as string || null
  const category_group = formData.get('category_group') as string || null
  const is_fixed = formData.get('is_fixed') === 'true'

  const { error } = await supabase
    .from('categories')
    .update({ name, icon, bucket, category_group, is_fixed })
    .eq('id', categoryId)

  if (error) return { error: error.message }

  revalidatePath(`/${accountId}`)
  return { success: true }
}

const HOUSEHOLD_CATEGORIES = [
  { name: 'שכר דירה', icon: '🏠' },
  { name: 'משכנתא', icon: '🏦' },
  { name: 'חשמל', icon: '⚡' },
  { name: 'גז', icon: '🔥' },
  { name: 'מים', icon: '💧' },
  { name: 'ארנונה', icon: '🏛️' },
  { name: 'ועד בית', icon: '🏢' },
  { name: 'אינטרנט', icon: '🌐' },
]

export async function setupHouseholdCategories(accountId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: existing } = await supabase
    .from('categories')
    .select('name')
    .eq('account_id', accountId)
    .eq('category_group', 'משק בית')

  const existingNames = new Set((existing ?? []).map((c) => c.name))

  for (const cat of HOUSEHOLD_CATEGORIES) {
    if (existingNames.has(cat.name)) continue
    const { data: newCat } = await supabase
      .from('categories')
      .insert({
        account_id: accountId,
        name: cat.name,
        icon: cat.icon,
        type: 'expense',
        bucket: 'מחיה',
        category_group: 'משק בית',
        is_fixed: true,
      })
      .select()
      .single()
    if (newCat) {
      await supabase.from('budget_templates').insert({
        account_id: accountId,
        category_id: newCat.id,
        monthly_amount: 0,
      })
    } else {
      console.error('Failed to insert household category:', cat.name)
    }
  }

  revalidatePath(`/${accountId}`, 'layout')
  return { success: true }
}

export async function deleteCategory(categoryId: string, accountId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('categories').delete().eq('id', categoryId)

  if (error) return { error: error.message }

  revalidatePath(`/${accountId}`)
  return { success: true }
}

export async function updateBudgetTemplate(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const accountId = formData.get('accountId') as string
  const categoryId = formData.get('categoryId') as string
  const monthlyAmount = parseFloat(formData.get('monthlyAmount') as string) || 0

  const { error } = await supabase
    .from('budget_templates')
    .upsert(
      { account_id: accountId, category_id: categoryId, monthly_amount: monthlyAmount },
      { onConflict: 'account_id,category_id' }
    )

  if (error) return { error: error.message }

  revalidatePath(`/${accountId}`)
  return { success: true }
}

export async function updateMonthBudget(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const accountId = formData.get('accountId') as string
  const categoryId = formData.get('categoryId') as string
  const year = parseInt(formData.get('year') as string)
  const month = parseInt(formData.get('month') as string)
  const monthlyAmount = parseFloat(formData.get('monthlyAmount') as string) || 0

  const { error } = await supabase
    .from('month_budgets')
    .upsert(
      { account_id: accountId, category_id: categoryId, year, month, monthly_amount: monthlyAmount },
      { onConflict: 'account_id,category_id,year,month' }
    )

  if (error) return { error: error.message }

  // Also update the base template so the amount carries to future months
  await supabase
    .from('budget_templates')
    .upsert(
      { account_id: accountId, category_id: categoryId, monthly_amount: monthlyAmount },
      { onConflict: 'account_id,category_id' }
    )

  revalidatePath(`/${accountId}/${year}/${month}`)
  return { success: true }
}
