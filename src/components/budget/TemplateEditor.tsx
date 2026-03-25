'use client'

import { useState, useTransition } from 'react'
import type { Category } from '@/lib/types'
import { updateBudgetTemplate, deleteCategory } from '@/app/actions/categories'
import AddCategoryDialog from './AddCategoryDialog'
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react'

interface CatWithAmount extends Category {
  monthly_amount: number
}

function CategoryRow({ cat, accountId }: { cat: CatWithAmount; accountId: string }) {
  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState(String(cat.monthly_amount))
  const [isPending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('accountId', accountId)
      fd.set('categoryId', cat.id)
      fd.set('monthlyAmount', amount)
      await updateBudgetTemplate(fd)
      setEditing(false)
    })
  }

  function handleDelete() {
    if (!confirm(`למחוק את הקטגוריה "${cat.name}"? זה יסיר אותה מכל החודשים.`)) return
    startTransition(async () => { await deleteCategory(cat.id, accountId) })
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 group">
      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
      <span className="flex-1 text-sm font-medium text-slate-800">{cat.name}</span>

      {editing ? (
        <div className="flex items-center gap-1">
          <span className="text-slate-400 text-xs">₪</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-24 text-sm border border-slate-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-400"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
          />
          <button onClick={save} disabled={isPending} className="p-1 text-emerald-500 hover:text-emerald-600">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => setEditing(false)} className="p-1 text-slate-400 hover:text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">
            {cat.monthly_amount > 0
              ? new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(cat.monthly_amount)
              : <span className="text-slate-300 font-normal text-xs">לא הוגדר</span>}
          </span>
          <button
            onClick={() => { setAmount(String(cat.monthly_amount)); setEditing(true) }}
            className="p-1 text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"
            title="ערוך תקציב"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
            title="מחק קטגוריה"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

interface TemplateEditorProps {
  categories: CatWithAmount[]
  accountId: string
}

export default function TemplateEditor({ categories, accountId }: TemplateEditorProps) {
  const [showAddIncome, setShowAddIncome] = useState(false)
  const [showAddExpense, setShowAddExpense] = useState(false)

  const incomeCategories = categories.filter((c) => c.type === 'income')
  const expenseCategories = categories.filter((c) => c.type === 'expense')

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">קטגוריות הכנסה</h2>
            <p className="text-xs text-slate-400 mt-0.5">הכנסה חודשית צפויה לפי מקור</p>
          </div>
          <button onClick={() => setShowAddIncome(true)} className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
            <Plus className="w-3.5 h-3.5" />
            הוסף
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {incomeCategories.length === 0
            ? <p className="px-4 py-6 text-center text-slate-400 text-sm">אין קטגוריות הכנסה עדיין.</p>
            : incomeCategories.map((c) => <CategoryRow key={c.id} cat={c} accountId={accountId} />)
          }
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">קטגוריות הוצאה</h2>
            <p className="text-xs text-slate-400 mt-0.5">תקציב הוצאה חודשי לפי קטגוריה</p>
          </div>
          <button onClick={() => setShowAddExpense(true)} className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
            <Plus className="w-3.5 h-3.5" />
            הוסף
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {expenseCategories.length === 0
            ? <p className="px-4 py-6 text-center text-slate-400 text-sm">אין קטגוריות הוצאה עדיין.</p>
            : expenseCategories.map((c) => <CategoryRow key={c.id} cat={c} accountId={accountId} />)
          }
        </div>
      </div>

      {showAddIncome && <AddCategoryDialog type="income" accountId={accountId} onClose={() => setShowAddIncome(false)} />}
      {showAddExpense && <AddCategoryDialog type="expense" accountId={accountId} onClose={() => setShowAddExpense(false)} />}
    </div>
  )
}
