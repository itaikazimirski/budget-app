'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateMonthBudget } from '@/app/actions/categories'
import type { CategoryWithStats } from '@/lib/types'

export function useHouseholdBudget(category: CategoryWithStats, accountId: string, year: number, month: number) {
  const [editing, setEditing] = useState(false)
  const [budgetInput, setBudgetInput] = useState(String(category.budget_amount))
  const [isPending, startTransition] = useTransition()

  function startEditing(initialValue?: number) {
    setBudgetInput(String(initialValue ?? category.budget_amount))
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
  }

  function handleSaveBudget() {
    const amount = parseFloat(budgetInput)
    if (isNaN(amount) || amount < 0) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set('accountId', accountId)
      fd.set('categoryId', category.id)
      fd.set('year', String(year))
      fd.set('month', String(month))
      fd.set('monthlyAmount', String(amount))
      const result = await updateMonthBudget(fd)
      if (result?.error) { toast.error('שגיאה בשמירת התקציב'); return }
      toast.success('התקציב עודכן')
      setEditing(false)
    })
  }

  return { editing, budgetInput, setBudgetInput, isPending, startEditing, cancelEditing, handleSaveBudget }
}
