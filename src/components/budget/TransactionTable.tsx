'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import type { Transaction, Category } from '@/lib/types'
import { addTransaction, updateTransaction, deleteTransaction } from '@/app/actions/transactions'
import { Plus, Trash2, Edit2, Check, X, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface TransactionTableProps {
  transactions: (Transaction & { entered_by?: string | null })[]
  categories: Category[]
  accountId: string
  year: number
  month: number
}

function formatILS(amount: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: 'short' })
}

interface AddFormProps {
  categories: Category[]
  accountId: string
  year: number
  month: number
  onClose: () => void
}

function AddTransactionForm({ categories, accountId, year, month, onClose }: AddFormProps) {
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const today = new Date()
  const defaultDate = `${year}-${String(month).padStart(2, '0')}-${String(Math.min(today.getDate(), new Date(year, month, 0).getDate())).padStart(2, '0')}`
  const filteredCats = categories.filter((c) => c.type === type)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('accountId', accountId)
    fd.set('type', type)
    startTransition(async () => {
      const result = await addTransaction(fd)
      if (result?.error) setError(result.error)
      else onClose()
    })
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50 p-4">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2 mb-3">
          <button type="button" onClick={() => setType('expense')}
            className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-colors ${type === 'expense' ? 'bg-rose-100 text-rose-700' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}>
            הוצאה
          </button>
          <button type="button" onClick={() => setType('income')}
            className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-colors ${type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}>
            הכנסה
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">סכום (₪)</label>
            <Input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required className="h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">תאריך</label>
            <Input name="date" type="date" defaultValue={defaultDate} required className="h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">קטגוריה</label>
            <select name="categoryId" className="w-full h-8 text-sm border border-slate-200 rounded-md px-2 bg-white focus:outline-none focus:border-indigo-400">
              <option value="">ללא קטגוריה</option>
              {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">הערות (אופציונלי)</label>
            <Input name="notes" placeholder='למשל: סופרמרקט' className="h-8 text-sm" />
          </div>
        </div>

        {error && <p className="text-xs text-rose-600 mb-2">{error}</p>}

        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="flex-1 h-8">ביטול</Button>
          <Button type="submit" size="sm" disabled={isPending} className="flex-1 h-8 bg-indigo-600 hover:bg-indigo-700 text-white">
            {isPending ? 'שומר...' : 'הוסף'}
          </Button>
        </div>
      </form>
    </div>
  )
}

interface EditRowProps {
  tx: Transaction & { entered_by?: string | null }
  categories: Category[]
  accountId: string
  year: number
  month: number
  onClose: () => void
}

function EditRow({ tx, categories, accountId, year, month, onClose }: EditRowProps) {
  const [amount, setAmount] = useState(String(tx.amount))
  const [date, setDate] = useState(tx.date)
  const [notes, setNotes] = useState(tx.notes ?? '')
  const [categoryId, setCategoryId] = useState(tx.category_id ?? '')
  const [isPending, startTransition] = useTransition()

  const filteredCats = categories.filter((c) => c.type === tx.type)

  function handleSave() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('transactionId', tx.id)
      fd.set('accountId', accountId)
      fd.set('amount', amount)
      fd.set('date', date)
      fd.set('notes', notes)
      fd.set('categoryId', categoryId)
      fd.set('type', tx.type)
      await updateTransaction(fd)
      onClose()
    })
  }

  return (
    <div className="bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/50 px-4 py-3 flex flex-wrap items-center gap-2">
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-7 text-xs w-32" />
      <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="הערות" className="h-7 text-xs flex-1 min-w-[100px]" />
      <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
        className="h-7 text-xs border border-slate-200 rounded-md px-2 bg-white focus:outline-none focus:border-indigo-400">
        <option value="">ללא קטגוריה</option>
        {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-7 text-xs w-24" />
      <div className="flex gap-1">
        <button onClick={handleSave} disabled={isPending} className="p-1 text-emerald-500 hover:text-emerald-600">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-500">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function TransactionTable({ transactions, categories, accountId, year, month }: TransactionTableProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())
  const filterRef = useRef<HTMLDivElement>(null)

  // Close filter menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Categories that actually have transactions this month
  const activeCategoryIds = [...new Set(transactions.map((tx) => tx.category_id).filter(Boolean))] as string[]
  const activeCategories = categories.filter((c) => activeCategoryIds.includes(c.id))

  const isFiltered = selectedCategoryIds.size > 0
  const visibleTransactions = isFiltered
    ? transactions.filter((tx) => tx.category_id && selectedCategoryIds.has(tx.category_id))
    : transactions

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearFilter() {
    setSelectedCategoryIds(new Set())
    setShowFilterMenu(false)
  }

  function handleDelete(id: string) {
    if (!confirm('למחוק את הפעולה הזו?')) return
    startTransition(async () => {
      await deleteTransaction(id, accountId, year, month)
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
            פעולות
            {visibleTransactions.length > 0 && (
              <span className="ms-1.5 text-xs text-slate-400 font-normal">
                ({visibleTransactions.length}{isFiltered ? ` מתוך ${transactions.length}` : ''})
              </span>
            )}
          </h3>

          {/* Filter button */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilterMenu((v) => !v)}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${
                isFiltered
                  ? 'bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-700 dark:text-indigo-300'
                  : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'
              }`}
            >
              <Filter className="w-3 h-3" />
              {isFiltered ? `${selectedCategoryIds.size} נבחרו` : 'סנן'}
            </button>

            {/* Dropdown */}
            {showFilterMenu && activeCategories.length > 0 && (
              <div className="absolute top-full mt-1 right-0 z-30 bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-xl shadow-lg p-2 min-w-[160px]">
                {isFiltered && (
                  <button onClick={clearFilter} className="w-full text-right text-xs text-rose-500 hover:text-rose-700 px-2 py-1.5 rounded-lg hover:bg-rose-50 mb-1">
                    נקה סינון ✕
                  </button>
                )}
                {activeCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`w-full flex items-center gap-2 text-right text-xs px-2 py-1.5 rounded-lg transition-colors ${
                      selectedCategoryIds.has(cat.id)
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                      selectedCategoryIds.has(cat.id) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'
                    }`}>
                      {selectedCategoryIds.has(cat.id) && <Check className="w-2.5 h-2.5 text-white" />}
                    </span>
                    <span>{cat.icon}</span>
                    <span className="truncate">{cat.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {isFiltered && (
            <button onClick={clearFilter} className="text-xs text-slate-400 hover:text-rose-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Button size="sm" onClick={() => setShowAdd(!showAdd)}
          className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1">
          <Plus className="w-3 h-3" />
          הוסף
        </Button>
      </div>

      {showAdd && (
        <AddTransactionForm categories={categories} accountId={accountId} year={year} month={month} onClose={() => setShowAdd(false)} />
      )}

      {transactions.length === 0 ? (
        <div className="px-4 py-10 text-center text-slate-400 text-sm">אין פעולות החודש עדיין.</div>
      ) : visibleTransactions.length === 0 ? (
        <div className="px-4 py-10 text-center text-slate-400 text-sm">אין פעולות לקטגוריות שנבחרו.</div>
      ) : (
        <div className="p-3 space-y-2 max-w-3xl mx-auto">
          {visibleTransactions.map((tx) =>
            editingId === tx.id ? (
              <EditRow key={tx.id} tx={tx} categories={categories} accountId={accountId} year={year} month={month} onClose={() => setEditingId(null)} />
            ) : (
              <div key={tx.id} className="bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-100 dark:border-white/[0.06] px-4 py-3 flex items-center gap-4 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors group">

                {/* Right: category + date */}
                <div className="flex items-center gap-2 shrink-0 min-w-0 w-36">
                  <span className="text-lg shrink-0">{tx.category?.icon ?? '📦'}</span>
                  <div className="min-w-0 text-right">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{tx.category?.name ?? '—'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(tx.date)}</p>
                  </div>
                </div>

                {/* Middle: notes */}
                <span className="flex-1 text-sm text-slate-500 dark:text-slate-400 truncate text-right min-w-0">
                  {tx.notes ?? ''}
                </span>

                {/* Left: amount + actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`font-semibold text-sm ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatILS(tx.amount)}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => setEditingId(tx.id)} className="p-1 text-slate-300 hover:text-indigo-500" title="ערוך">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(tx.id)} disabled={isPending} className="p-1 text-slate-300 hover:text-rose-500" title="מחק">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
