import type { SupabaseClient } from '@supabase/supabase-js'

export type AuditAction =
  | 'transaction.create'
  | 'transaction.update'
  | 'transaction.delete'
  | 'category.create'
  | 'category.delete'
  | 'budget.update_month'
  | 'budget.update_template'
  | 'account.rename'
  | 'member.invite'
  | 'category_group.create'
  | 'category_group.delete'

interface AuditParams {
  account_id: string
  user_id: string
  action: AuditAction
  entity_id?: string
  metadata?: Record<string, unknown>
}

/**
 * Fire-and-forget audit log insert.
 * Never throws — a logging failure must never break the actual operation.
 */
export function logAudit(supabase: SupabaseClient, params: AuditParams): void {
  supabase.from('audit_logs').insert(params).then(({ error }) => {
    if (error) console.error('[auditLog] failed to insert:', error.message, params)
  })
}
