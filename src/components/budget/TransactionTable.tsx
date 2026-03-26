'use client'

import { useState, useTransition } from 'react'
import type { Transaction, Category } from '@/lib/types'
import { addTransaction, updateTransaction, deleteTransaction } from '@/app/actions/transactions'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

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
    <tr className="bg-indigo-50 border-b border-indigo-100">
      <td className="px-4 py-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-7 text-xs w-32" />
      </td>
      <td className="px-4 py-2">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="הערות" className="h-7 text-xs" />
      </td>
      <td className="px-4 py-2">
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
          className="h-7 text-xs border border-slate-200 rounded-md px-2 bg-white focus:outline-none focus:border-indigo-400 w-full">
          <option value="">ללא קטגוריה</option>
          {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </td>
      <td className="px-4 py-2">
        <Badge variant="secondary" className={`text-xs ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {tx.type === 'income' ? 'הכנסה' : 'הוצאה'}
        </Badge>
      </td>
      <td className="px-4 py-2">
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-7 text-xs w-24" />
      </td>
      <td className="px-4 py-2 text-xs text-slate-400">{tx.entered_by}</td>
      <td className="px-2 py-2">
        <div className="flex gap-1">
          <button onClick={handleSave} disabled={isPending} className="p-1 text-emerald-500 hover:text-emerald-600">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-500">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function TransactionTable({ transactions, categories, accountId, year, month }: TransactionTableProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete(id: string) {
    if (!confirm('למחוק את הפעולה הזו?')) return
    startTransition(async () => {
      await deleteTransaction(id, accountId, year, month)
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900 text-sm">
          פעולות
          {transactions.length > 0 && (
            <span className="ms-1.5 text-xs text-slate-400 font-normal">({transactions.length})</span>
          )}
        </h3>
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
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-center px-4 py-2 text-sm text-slate-900 font-semibold">תאריך</th>
                <th className="text-center px-4 py-2 text-sm text-slate-900 font-semibold">הערות</th>
                <th className="text-center px-4 py-2 text-sm text-slate-900 font-semibold">קטגוריה</th>
                <th className="text-center px-4 py-2 text-sm text-slate-900 font-semibold">סוג</th>
                <th className="text-center px-4 py-2 text-sm text-slate-900 font-semibold">סכום</th>
                <th className="text-center px-4 py-2 text-sm text-slate-900 font-semibold">הוזן על ידי</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.map((tx) =>
                editingId === tx.id ? (
                  <EditRow key={tx.id} tx={tx} categories={categories} accountId={accountId} year={year} month={month} onClose={() => setEditingId(null)} />
                ) : (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{formatDate(tx.date)}</td>
                    <td className="px-4 py-2.5 text-slate-700 max-w-[140px] truncate">{tx.notes ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      {tx.category ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tx.category.color }} />
                          <span className="text-slate-700 text-xs truncate max-w-[100px]">{tx.category.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="secondary" className={`text-xs ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {tx.type === 'income' ? 'הכנסה' : 'הוצאה'}
                      </Badge>
                    </td>
                    <td className={`px-4 py-2.5 text-left font-semibold whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {tx.type === 'income' ? '+' : ''}{formatILS(tx.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{tx.entered_by}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => setEditingId(tx.id)} className="p-1 text-slate-300 hover:text-indigo-500" title="ערוך">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(tx.id)} disabled={isPending} className="p-1 text-slate-300 hover:text-rose-500" title="מחק">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
