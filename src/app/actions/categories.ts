'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CategoryType } from '@/lib/types'
import { assertAccountAccess } from '@/lib/assertAccountAccess'
import { validateName, validateAmount, validateYear, validateMonth, validateEnum, validateUuid } from '@/lib/validate'
import { logAudit } from '@/lib/auditLog'

export async function addCategory(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const accountId = validateUuid(formData.get('accountId'))
  if (!accountId) return { error: 'Invalid account' }

  try { await assertAccountAccess(supabase, user.id, accountId) }
  catch { return { error: 'Access denied' } }

  const name = validateName(formData.get('name'))
  if (!name) return { error: 'Invalid name' }

  const type = validateEnum<CategoryType>(formData.get('type'), ['income', 'expense'])
  if (!type) return { error: 'Invalid type' }

  const icon = validateName(formData.get('icon'), 10) ?? '📦'
  const bucket = validateName(formData.get('bucket'), 100) ?? null
  const category_group = validateName(formData.get('category_group'), 100) ?? null
  const is_fixed = formData.get('is_fixed') === 'true'
  const monthlyAmount = validateAmount(formData.get('monthlyAmount')) ?? 0
  const group_id = validateUuid(formData.get('group_id')) ?? null

  const rawYear = formData.get('one_time_year')
  const rawMonth = formData.get('one_time_month')
  const one_time_year = rawYear ? validateYear(rawYear) : null
  const one_time_month = rawMonth ? validateMonth(rawMonth) : null

  if (rawYear && one_time_year === null) return { error: 'Invalid year' }
  if (rawMonth && one_time_month === null) return { error: 'Invalid month' }

  const isOneTime = one_time_year !== null && one_time_month !== null

  const { data: category, error } = await supabase
    .from('categories')
    .insert({ account_id: accountId, name, type, icon, bucket, category_group, is_fixed, one_time_year, one_time_month, group_id })
    .select()
    .single()

  if (error) return { error: error.message }

  if (isOneTime) {
    await supabase.from('month_budgets').insert({
      account_id: accountId,
      category_id: category.id,
      year: one_time_year,
      month: one_time_month,
      monthly_amount: monthlyAmount,
    })
  } else {
    await supabase.from('budget_templates').insert({
      account_id: accountId,
      category_id: category.id,
      monthly_amount: monthlyAmount,
    })
  }

  logAudit(supabase, {
    account_id: accountId, user_id: user.id, action: 'category.create',
    entity_id: category.id,
    metadata: { name, type },
  })

  revalidatePath(`/${accountId}`)
  return { success: true }
}

export async function updateCategory(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const accountId = validateUuid(formData.get('accountId'))
  const categoryId = validateUuid(formData.get('categoryId'))
  if (!accountId || !categoryId) return { error: 'Invalid input' }

  try { await assertAccountAccess(supabase, user.id, accountId) }
  catch { return { error: 'Access denied' } }

  const name = validateName(formData.get('name'))
  if (!name) return { error: 'Invalid name' }

  const icon = validateName(formData.get('icon'), 10) ?? '📦'
  const bucket = validateName(formData.get('bucket'), 100) ?? null
  const category_group = validateName(formData.get('category_group'), 100) ?? null
  const is_fixed = formData.get('is_fixed') === 'true'

  const { error } = await supabase
    .from('categories')
    .update({ name, icon, bucket, category_group, is_fixed })
    .eq('id', categoryId)
    .eq('account_id', accountId)

  if (error) return { error: error.message }

  revalidatePath(`/${accountId}`)
  return { success: true }
}

const HOUSEHOLD_CATEGORIES = [
  { name: 'שכר דירה', icon: '🏠', is_fixed: true },
  { name: 'משכנתא', icon: '🏦', is_fixed: true },
  { name: 'חשמל', icon: '⚡', is_fixed: false },
  { name: 'גז', icon: '🔥', is_fixed: false },
  { name: 'מים', icon: '💧', is_fixed: false },
  { name: 'ארנונה', icon: '🏛️', is_fixed: true },
  { name: 'ועד בית', icon: '🏢', is_fixed: true },
  { name: 'אינטרנט', icon: '🌐', is_fixed: true },
]

export async function setupHouseholdCategories(accountId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!validateUuid(accountId)) return { error: 'Invalid account' }
  try { await assertAccountAccess(supabase, user.id, accountId) }
  catch { return { error: 'Access denied' } }

  // Find or create the 'משק בית' group so categories get a group_id immediately
  let groupId: string | null = null
  const { data: existingGroup } = await supabase
    .from('category_groups')
    .select('id')
    .eq('account_id', accountId)
    .eq('name', 'משק בית')
    .single()

  if (existingGroup) {
    groupId = existingGroup.id
  } else {
    const { data: maxOrder } = await supabase
      .from('category_groups')
      .select('sort_order')
      .eq('account_id', accountId)
      .order('sort_order', { ascending: false })
      .limit(1)
    const sort_order = maxOrder && maxOrder.length > 0 ? maxOrder[0].sort_order + 1 : 0
    const { data: newGroup } = await supabase
      .from('category_groups')
      .insert({ account_id: accountId, name: 'משק בית', sort_order })
      .select('id')
      .single()
    groupId = newGroup?.id ?? null
  }

  const { data: existing } = await supabase
    .from('categories')
    .select('name')
    .eq('account_id', accountId)
    .eq('category_group', 'משק בית')
    .eq('is_archived', false)

  const existingNames = new Set((existing ?? []).map((c) => c.name))

  for (const cat of HOUSEHOLD_CATEGORIES) {
    if (existingNames.has(cat.name)) continue
    const { data: newCat, error: insertError } = await supabase
      .from('categories')
      .insert({
        account_id: accountId,
        name: cat.name,
        icon: cat.icon,
        type: 'expense',
        bucket: 'מחיה',
        category_group: 'משק בית',
        is_fixed: cat.is_fixed,
        ...(groupId ? { group_id: groupId } : {}),
      })
      .select()
      .single()
    if (insertError) return { error: `שגיאה ב-${cat.name}: ${insertError.message}` }
    if (newCat) {
      await supabase.from('budget_templates').insert({
        account_id: accountId,
        category_id: newCat.id,
        monthly_amount: 0,
      })
    }
  }

  revalidatePath(`/${accountId}`, 'layout')
  return { success: true }
}

export async function disableHouseholdCategories(accountId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!validateUuid(accountId)) return { error: 'Invalid account' }
  try { await assertAccountAccess(supabase, user.id, accountId) }
  catch { return { error: 'Access denied' } }

  const { error } = await supabase
    .from('categories')
    .update({ is_archived: true })
    .eq('account_id', accountId)
    .eq('category_group', 'משק בית')

  if (error) return { error: error.message }

  await supabase
    .from('category_groups')
    .delete()
    .eq('account_id', accountId)
    .eq('name', 'משק בית')

  revalidatePath(`/${accountId}`, 'layout')
  return { success: true }
}

export async function deleteCategory(categoryId: string, accountId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!validateUuid(categoryId) || !validateUuid(accountId)) return { error: 'Invalid input' }
  try { await assertAccountAccess(supabase, user.id, accountId) }
  catch { return { error: 'Access denied' } }

  const { error } = await supabase.from('categories').update({ is_archived: true }).eq('id', categoryId).eq('account_id', accountId)

  if (error) return { error: error.message }

  logAudit(supabase, {
    account_id: accountId, user_id: user.id, action: 'category.delete',
    entity_id: categoryId,
  })

  revalidatePath(`/${accountId}`)
  return { success: true }
}

export async function updateBudgetTemplate(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const accountId = validateUuid(formData.get('accountId'))
  const categoryId = validateUuid(formData.get('categoryId'))
  if (!accountId || !categoryId) return { error: 'Invalid input' }

  try { await assertAccountAccess(supabase, user.id, accountId) }
  catch { return { error: 'Access denied' } }

  const monthlyAmount = validateAmount(formData.get('monthlyAmount')) ?? 0

  const { error } = await supabase
    .from('budget_templates')
    .upsert(
      { account_id: accountId, category_id: categoryId, monthly_amount: monthlyAmount },
      { onConflict: 'account_id,category_id' }
    )

  if (error) return { error: error.message }

  logAudit(supabase, {
    account_id: accountId, user_id: user.id, action: 'budget.update_template',
    entity_id: categoryId, metadata: { amount: monthlyAmount },
  })

  revalidatePath(`/${accountId}`)
  return { success: true }
}

// Updates only this specific month — does not affect the base template
export async function updateMonthBudget(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const accountId = validateUuid(formData.get('accountId'))
  const categoryId = validateUuid(formData.get('categoryId'))
  if (!accountId || !categoryId) return { error: 'Invalid input' }

  try { await assertAccountAccess(supabase, user.id, accountId) }
  catch { return { error: 'Access denied' } }

  const year = validateYear(formData.get('year'))
  const month = validateMonth(formData.get('month'))
  if (year === null || month === null) return { error: 'Invalid date' }

  const monthlyAmount = validateAmount(formData.get('monthlyAmount')) ?? 0

  const { error } = await supabase
    .from('month_budgets')
    .upsert(
      { account_id: accountId, category_id: categoryId, year, month, monthly_amount: monthlyAmount },
      { onConflict: 'account_id,category_id,year,month' }
    )

  if (error) return { error: error.message }

  logAudit(supabase, {
    account_id: accountId, user_id: user.id, action: 'budget.update_month',
    entity_id: categoryId, metadata: { amount: monthlyAmount, year, month },
  })

  revalidatePath(`/${accountId}/${year}/${month}`)
  return { success: true }
}

// Updates the base template (recurring) — affects all future months
export async function updateTemplateBudget(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const accountId = validateUuid(formData.get('accountId'))
  const categoryId = validateUuid(formData.get('categoryId'))
  if (!accountId || !categoryId) return { error: 'Invalid input' }

  try { await assertAccountAccess(supabase, user.id, accountId) }
  catch { return { error: 'Access denied' } }

  const year = validateYear(formData.get('year'))
  const month = validateMonth(formData.get('month'))
  if (year === null || month === null) return { error: 'Invalid date' }

  const monthlyAmount = validateAmount(formData.get('monthlyAmount')) ?? 0

  const { error } = await supabase
    .from('budget_templates')
    .upsert(
      { account_id: accountId, category_id: categoryId, monthly_amount: monthlyAmount },
      { onConflict: 'account_id,category_id' }
    )

  if (error) return { error: error.message }

  revalidatePath(`/${accountId}/${year}/${month}`)
  return { success: true }
}
