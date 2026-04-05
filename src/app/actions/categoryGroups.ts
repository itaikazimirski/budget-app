'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const GROUP_MAP: Record<string, string> = {
  'מנוי': 'מנויים',
  'ביטוח': 'ביטוחים',
  'משק בית': 'משק בית',
}

// Assigns any expense categories with group_id = null to the default group (idempotent)
export async function fixOrphanCategories(accountId: string) {
  const supabase = await createClient()

  const { data: orphans } = await supabase
    .from('categories')
    .select('id')
    .eq('account_id', accountId)
    .eq('type', 'expense')
    .is('group_id', null)

  if (!orphans || orphans.length === 0) return

  // Find or create the default group
  const { data: groups } = await supabase
    .from('category_groups')
    .select('id, name, sort_order')
    .eq('account_id', accountId)
    .order('sort_order')

  let defaultGroupId: string | null = null

  if (groups && groups.length > 0) {
    // Prefer a group named 'הוצאות שוטפות', otherwise use first
    const preferred = groups.find((g) => g.name === 'הוצאות שוטפות') ?? groups[0]
    defaultGroupId = preferred.id
  } else {
    // No groups at all — create the default
    const { data: created } = await supabase
      .from('category_groups')
      .insert({ account_id: accountId, name: 'הוצאות שוטפות', sort_order: 0 })
      .select()
      .single()
    defaultGroupId = created?.id ?? null
  }

  if (!defaultGroupId) return

  await supabase
    .from('categories')
    .update({ group_id: defaultGroupId })
    .eq('account_id', accountId)
    .eq('type', 'expense')
    .is('group_id', null)
}

// Runs once per account — migrates flat categories into groups
export async function migrateToGroups(accountId: string) {
  const supabase = await createClient()

  // Check if already migrated
  const { data: existing } = await supabase
    .from('category_groups')
    .select('id')
    .eq('account_id', accountId)
    .limit(1)

  if (existing && existing.length > 0) return // already done

  // Fetch all categories for this account
  const { data: categories } = await supabase
    .from('categories')
    .select('id, category_group')
    .eq('account_id', accountId)

  if (!categories || categories.length === 0) return

  // Determine which named groups are needed
  const neededGroups = new Set<string>()
  let hasDefault = false
  for (const cat of categories) {
    if (cat.category_group && GROUP_MAP[cat.category_group]) {
      neededGroups.add(GROUP_MAP[cat.category_group])
    } else {
      hasDefault = true
    }
  }

  // Create groups in order: default first, then named ones
  const groupsToCreate: { name: string; sort_order: number }[] = []
  if (hasDefault) groupsToCreate.push({ name: 'הוצאות שוטפות', sort_order: 0 })
  Array.from(neededGroups).forEach((name, i) => groupsToCreate.push({ name, sort_order: i + 1 }))

  const { data: createdGroups } = await supabase
    .from('category_groups')
    .insert(groupsToCreate.map((g) => ({ ...g, account_id: accountId })))
    .select()

  if (!createdGroups) return

  const groupByName = Object.fromEntries(createdGroups.map((g) => [g.name, g.id]))

  // Assign each category to its group
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

  const { data: existing } = await supabase
    .from('category_groups')
    .select('sort_order')
    .eq('account_id', accountId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const sort_order = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const { error } = await supabase
    .from('category_groups')
    .insert({ account_id: accountId, name, sort_order })

  if (error) return { error: error.message }

  revalidatePath(`/${accountId}`, 'layout')
  return { success: true }
}

export async function updateCategoryGroup(groupId: string, name: string, accountId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('category_groups')
    .update({ name })
    .eq('id', groupId)

  if (error) return { error: error.message }

  revalidatePath(`/${accountId}`, 'layout')
  return { success: true }
}

export async function deleteCategoryGroup(groupId: string, accountId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Unassign categories from this group before deleting
  await supabase.from('categories').update({ group_id: null }).eq('group_id', groupId)

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

  const { error } = await supabase
    .from('categories')
    .update({ group_id: groupId })
    .eq('id', categoryId)

  if (error) return { error: error.message }

  revalidatePath(`/${accountId}`, 'layout')
  return { success: true }
}
