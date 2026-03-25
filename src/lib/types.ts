export type CategoryType = 'income' | 'expense'
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
  color: string
  created_at: string
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

export const CATEGORY_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#a855f7', // purple
  '#ec4899', // pink
  '#f43f5e', // rose
  '#84cc16', // lime
  '#06b6d4', // cyan
]

export const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]
