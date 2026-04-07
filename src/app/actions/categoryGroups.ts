'use server'

import { createClient } from '@/lib/supabase/server'
import { assertAccountAccess } from '@/lib/assertAccountAccess'
import { revalidatePath } from 'next/cache'
import { validateName, validateUuid } from '@/lib/validate'

const GROUP_MAP: Record<string, string> = {
  'מנוי': 'מנויים',
  'ביטוח': 'ביטוחים',
  'משק בית': 'משק בית',
}

// Assigns orphan expense categories (group_id = null) to the correct group.
// Batches updates — one DB write per target group, not per category. Idempotent.
export async function fixOrphanCategories(accountId: string) {
  const supabase = await createClient()

  const { data: orphans } = await supabase
    .from('categories')
    .select('id, category_group')
    .eq('account_id', accountId)
    .eq('type', 'expense')
    .is('group_id', null)

  if (!orphans || orphans.length === 0) return

  const { data: existingGroups } = await supabase
    .from('category_groups')
    .select('id, name, sort_order')
    .eq('account_id', accountId)
    .order('sort_order')

  const groupByName: Record<string, string> = {}
  for (const g of existingGroups ?? []) groupByName[g.name] = g.id
  let nextOrder = Math.max(-1, ...(existingGroups ?? []).map((g) => g.sort_order)) + 1

  async function ensureGroup(name: string): Promise<string | null> {
    if (groupByName[name]) return groupByName[name]
    const { data } = await supabase
      .from('category_groups')
      .insert({ account_id: accountId, name, sort_order: nextOrder++ })
      .select('id')
      .single()
    if (data) groupByName[name] = data.id
    return data?.id ?? null
  }

  const byTarget: Record<string, string[]> = {}
  for (const cat of orphans) {
    const targetName = cat.category_group && GROUP_MAP[cat.category_group as string]
      ? GROUP_MAP[cat.category_group as string]
      : 'הוצאות שוטפות'
    if (!byTarget[targetName]) byTarget[targetName] = []
    byTarget[targetName].push(cat.id)
  }

  for (const [targetName, ids] of Object.entries(byTarget)) {
    const groupId = await ensureGroup(targetName)
    if (groupId) {
      await supabase.from('categories').update({ group_id: groupId }).in('id', ids)
    }
  }
}

// Corrects categories that have a category_group value but landed in the wrong group.
// Idempotent — safe to run on every page load.
export async function reassignMisplacedCategories(accountId: string) {
  const supabase = await createClient()

  const { data: cats } = await supabase
    .from('categories')
    .select('id, category_group, group_id')
    .eq('account_id', accountId)
    .eq('type', 'expense')
    .not('category_group', 'is', null)

  if (!cats || cats.length === 0) return

  const { data: existingGroups } = await supabase
    .from('category_groups')
    .select('id, name, sort_order')
    .eq('account_id', accountId)
    .order('sort_order')

  const groupById: Record<string, string> = {}
  const groupByName: Record<string, string> = {}
  for (const g of existingGroups ?? []) {
    groupById[g.id] = g.name
    groupByName[g.name] = g.id
  }
  let nextOrder = Math.max(-1, ...(existingGroups ?? []).map((g) => g.sort_order)) + 1

  async function ensureGroup(name: string): Promise<string | null> {
    if (groupByName[name]) return groupByName[name]
    const { data } = await supabase
      .from('category_groups')
      .insert({ account_id: accountId, name, sort_order: nextOrder++ })
      .select('id')
      .single()
    if (data) groupByName[name] = data.id
    return data?.id ?? null
  }

  const byTarget: Record<string, string[]> = {}
  for (const cat of cats) {
    const expectedGroupName = GROUP_MAP[cat.category_group as string]
    if (!expectedGroupName) continue
    const currentGroupName = cat.group_id ? groupById[cat.group_id] : null
    if (currentGroupName === expectedGroupName) continue
    if (!byTarget[expectedGroupName]) byTarget[expectedGroupName] = []
    byTarget[expectedGroupName].push(cat.id)
  }

  if (Object.keys(byTarget).length === 0) return

  for (const [targetName, ids] of Object.entries(byTarget)) {
    const groupId = await ensureGroup(targetName)
    if (groupId) {
      await supabase.from('categories').update({ group_id: groupId }).in('id', ids)
    }
  }
}

// Runs once per account — migrates flat categories into groups
export async function migrateToGroups(accountId: string) {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('category_groups')
    .select('id')
    .eq('account_id', accountId)
    .limit(1)

  if (existing && existing.length > 0) return

  const { data: categories } = await supabase
    .from('categories')
    .select('id, category_group')
    .eq('account_id', accountId)

  if (!categories || categories.length === 0) return

  const neededGroups = new Set<string>()
  let hasDefault = false
  for (const cat of categories) {
    if (cat.category_group && GROUP_MAP[cat.category_group]) {
      neededGroups.add(GROUP_MAP[cat.category_group])
    } else {
      hasDefault = true
    }
  }

  const groupsToCreate: { name: string; sort_order: number }[] = []
  if (hasDefault) groupsToCreate.push({ name: 'הוצאות שוטפות', sort_order: 0 })
  Array.from(neededGroups).forEach((name, i) => groupsToCreate.push({ name, sort_order: i + 1 }))

  const { data: createdGroups } = await supabase
    .from('category_groups')
    .insert(groupsToCreate.map((g) => ({ ...g, account_id: accountId })))
    .select()

  if (!createdGroups) return

  const groupByName = Object.fromEntries(createdGroups.map((g) => [g.name, g.id]))

  await Promise.all(categories.map((cat) => {
    const mappedName = cat.category_group ? GROUP_MAP[cat.category_group] : null
    const group_id = mappedName ? groupByName[mappedName] : groupByName['הוצאות שוטפות']
    if (!group_id) return Promise.resolve()
    return supabase.from('categories').update({ group_id }).eq('id', cat.id)
  }))

  revalidatePath(`/${accountId}`, 'layout')
}

export async function createCategoryGroup(accountId: string, name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!validateUuid(accountId)) return { error: 'Invalid account' }
  const validName = validateName(name)
  if (!validName) return { error: 'Invalid group name' }

  try { await assertAccountAccess(supabase, user.id, accountId) }
  catch { return { error: 'Access denied' } }

  const { data: existing } = await supabase
    .from('category_groups')
    .select('sort_order')
    .eq('account_id', accountId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const sort_order = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const { error } = await supabase
    .from('category_groups')
    .insert({ account_id: accountId, name: validName, sort_order })

  if (error) return { error: error.message }

  revalidatePath(`/${accountId}`, 'layout')
  return { success: true }
}

export async function updateCategoryGroup(groupId: string, name: string, accountId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!validateUuid(groupId) || !validateUuid(accountId)) return { error: 'Invalid input' }
  const validName = validateName(name)
  if (!validName) return { error: 'Invalid group name' }

  try { await assertAccountAccess(supabase, user.id, accountId) }
  catch { return { error: 'Access denied' } }

  const { error } = await supabase
    .from('category_groups')
    .update({ name: validName })
    .eq('id', groupId)
    .eq('account_id', accountId)

  if (error) return { error: error.message }

  revalidatePath(`/${accountId}`, 'layout')
  return { success: true }
}

export async function deleteCategoryGroup(groupId: string, accountId: string, targetGroupId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!validateUuid(groupId) || !validateUuid(accountId)) return { error: 'Invalid input' }
  if (targetGroupId && !validateUuid(targetGroupId)) return { error: 'Invalid target group' }

  try { await assertAccountAccess(supabase, user.id, accountId) }
  catch { return { error: 'Access denied' } }

  if (targetGroupId) {
    await supabase.from('categories').update({ group_id: targetGroupId }).eq('group_id', groupId)
  } else {
    await supabase.from('categories').update({ group_id: null }).eq('group_id', groupId)
  }

  const { error } = await supabase
    .from('category_groups')
    .delete()
    .eq('id', groupId)

  if (error) return { error: error.message }

  revalidatePath(`/${accountId}`, 'layout')
  return { success: true }
}

export async function moveCategoryToGroup(categoryId: string, groupId: string | null, accountId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!validateUuid(categoryId) || !validateUuid(accountId)) return { error: 'Invalid input' }
  if (groupId && !validateUuid(groupId)) return { error: 'Invalid group' }

  try { await assertAccountAccess(supabase, user.id, accountId) }
  catch { return { error: 'Access denied' } }

  const { error } = await supabase
    .from('categories')
    .update({ group_id: groupId })
    .eq('id', categoryId)
    .eq('account_id', accountId)

  if (error) return { error: error.message }

  revalidatePath(`/${accountId}`, 'layout')
  return { success: true }
}
