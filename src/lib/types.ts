export type CategoryType = 'income' | 'expense'
export type CategoryBucket = 'מחיה' | 'מותרות' | 'חסכון'
export type CategoryGroup = 'מנוי' | 'ביטוח' | 'משק בית'
export const BUCKETS: CategoryBucket[] = ['מחיה', 'מותרות', 'חסכון']

export interface CategoryGroupRecord {
  id: string
  account_id: string
  name: string
  sort_order: number
  created_at: string
}
export type TransactionType = 'income' | 'expense'
export type AccountType = 'personal' | 'shared'

export interface Account {
  id: string
  name: string
  type: AccountType
  created_by: string
  created_at: string
}

export interface AccountMember {
  account_id: string
  user_id: string
  display_name: string | null
}

export interface Category {
  id: string
  account_id: string
  name: string
  type: CategoryType
  icon: string
  bucket: CategoryBucket | null
  category_group: CategoryGroup | null
  is_fixed: boolean
  is_archived: boolean
  created_at: string
  one_time_year: number | null
  one_time_month: number | null
  group_id: string | null
}

export interface BudgetTemplate {
  id: string
  account_id: string
  category_id: string
  monthly_amount: number
  category?: Category
}

export interface MonthBudget {
  id: string
  account_id: string
  category_id: string
  year: number
  month: number
  monthly_amount: number
}

export interface Transaction {
  id: string
  account_id: string
  category_id: string | null
  user_id: string
  amount: number
  type: TransactionType
  date: string
  notes: string | null
  created_at: string
  category?: Category | null
  entered_by?: string | null
}

export interface CategoryWithStats extends Category {
  budget_amount: number
  actual_amount: number
  remaining: number
  percentage: number
}

export interface MonthlyStats {
  totalIncome: number
  totalExpenses: number
  balance: number
  incomeCategories: CategoryWithStats[]
  expenseCategories: CategoryWithStats[]
}

export interface AIReportData {
  mood: string; // a single expressive emoji reflecting the financial mood
  tldr: string;
  highlights: { title: string; description: string; emoji: string }[];
  warnings: { category: string; issue: string; impact: "high" | "medium" | "low" }[];
  actionItem: string;
  categorySummary: {
    groupName: string;
    categories: { itemName: string; planned: number; actual: number }[];
  }[];
  expenseDetails: { itemName: string; planned: number; actual: number; remaining: number }[];
}

export const CATEGORY_ICONS = [
  '🛒', '🍕', '🍔', '☕', '🍷', '🍼', '🌿',
  '🚗', '⛽', '🚌', '✈️', '🚂', '🛵', '🚕',
  '🏠', '💡', '💧', '🔧', '📦', '🛋️', '🔑',
  '👕', '👟', '💄', '🧴', '🛍️', '💍', '🧢',
  '🎬', '🎮', '🎵', '📚', '🎨', '🎭', '⚽',
  '💊', '🏥', '🏋️', '🐕', '🐱', '🌸', '🧘',
  '👶', '🎓', '📱', '💻', '🔌', '🖨️', '⌨️',
  '💰', '💳', '🏦', '🎁', '📊', '🧾', '🏆',
]

export const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]
