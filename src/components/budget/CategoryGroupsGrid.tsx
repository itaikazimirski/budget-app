'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Check, X, FolderPlus } from 'lucide-react'
import type { CategoryWithStats, CategoryGroupRecord, Transaction } from '@/lib/types'
import { createCategoryGroup, updateCategoryGroup, deleteCategoryGroup } from '@/app/actions/categoryGroups'
import { updateMonthBudget, updateTemplateBudget } from '@/app/actions/categories'
import { formatILS } from '@/lib/budget-utils'
import AddCategoryDialog from './AddCategoryDialog'
import CategoryEditDialog from './CategoryEditDialog'

interface Props {
  groups: CategoryGroupRecord[]
  expenseCategories: CategoryWithStats[]
  incomeCategories: CategoryWithStats[]
  accountId: string
  year: number
  month: number
  transactions: (Transaction & { entered_by?: string | null })[]
}

function BudgetBar({ percentage, isOver }: { percentage: number; isOver: boolean }) {
  const color = isOver ? 'bg-rose-500' : percentage > 85 ? 'bg-rose-400' : percentage > 60 ? 'bg-amber-400' : 'bg-emerald-400'
  return (
    <div className="h-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden mt-1">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
    </div>
  )
}

function CategoryRow({
  category, accountId, year, month
}: {
  category: CategoryWithStats
  accountId: string
  year: number
  month: number
}) {
  const [editing, setEditing] = useState(false)
  const [budgetInput, setBudgetInput] = useState(String(category.budget_amount))
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showScopeModal, setShowScopeModal] = useState(false)
  const [pendingAmount, setPendingAmount] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  const { actual_amount, budget_amount, percentage } = category
  const isOver = actual_amount > budget_amount && budget_amount > 0
  const isOneTime = category.one_time_year !== null

  function handleSaveBudget() {
    const amount = parseFloat(budgetInput)
    if (isNaN(amount) || amount < 0) return
    if (isOneTime) {
      saveBudget('month', amount)
    } else {
      setPendingAmount(amount)
      setShowScopeModal(true)
    }
  }

  function saveBudget(scope: 'month' | 'template', amount: number) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('accountId', accountId)
      fd.set('categoryId', category.id)
      fd.set('year', String(year))
      fd.set('month', String(month))
      fd.set('monthlyAmount', String(amount))
      if (scope === 'month') await updateMonthBudget(fd)
      else await updateTemplateBudget(fd)
      setEditing(false)
      setShowScopeModal(false)
    })
  }

  return (
    <>
      <div className="group flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] rounded-lg transition-colors">
        <span className="text-base shrink-0">{category.icon ?? '📦'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{category.name}</span>
            <div className="flex items-center gap-1 shrink-0">
              {budget_amount > 0 ? (
                <span className={`text-xs ${isOver ? 'text-rose-500 font-semibold' : 'text-slate-400'}`}>
                  {formatILS(actual_amount)} / {formatILS(budget_amount)}
                </span>
              ) : (
                <span className="text-xs text-slate-400">{formatILS(actual_amount)}</span>
              )}
              <button
                onClick={() => setShowEditDialog(true)}
                className="p-0.5 text-slate-300 hover:text-slate-500 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity"
              >
                <Pencil className="w-2.5 h-2.5" />
              </button>
              {!editing ? (
                <button
                  onClick={() => { setBudgetInput(String(budget_amount)); setEditing(true) }}
                  className="p-0.5 text-slate-300 hover:text-indigo-500 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-2.5 h-2.5 rotate-45" />
                </button>
              ) : (
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    className="w-14 text-xs border border-slate-300 rounded px-1 py-0.5 focus:outline-none focus:border-indigo-400"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBudget(); if (e.key === 'Escape') setEditing(false) }}
                  />
                  <button onClick={handleSaveBudget} disabled={isPending} className="p-0.5 text-emerald-500">
                    <Check className="w-3 h-3" />
                  </button>
                  <button onClick={() => setEditing(false)} className="p-0.5 text-slate-400">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
          {budget_amount > 0 && <BudgetBar percentage={percentage} isOver={isOver} />}
        </div>
      </div>

      {showEditDialog && (
        <CategoryEditDialog category={category} accountId={accountId} onClose={() => setShowEditDialog(false)} />
      )}

      {showScopeModal && pendingAmount !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-card rounded-2xl shadow-xl w-full max-w-sm p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1 text-right">איך לשמור?</h3>
            <p className="text-sm text-slate-500 mb-4 text-right">{category.name} → {formatILS(pendingAmount)}</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => saveBudget('month', pendingAmount)} disabled={isPending}
                className="w-full px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-sm font-medium text-right hover:bg-indigo-100 transition-colors">
                <p className="font-semibold">החל על חודש זה בלבד</p>
                <p className="text-xs opacity-70 mt-0.5">מהחודש הבא יחזור לסכום הקבוע</p>
              </button>
              <button onClick={() => saveBudget('template', pendingAmount)} disabled={isPending}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 text-sm font-medium text-right hover:bg-slate-100 transition-colors">
                <p className="font-semibold">החל מעכשיו והלאה</p>
                <p className="text-xs opacity-70 mt-0.5">מעדכן את התקציב הקבוע</p>
              </button>
              <button onClick={() => { setShowScopeModal(false); setPendingAmount(null) }} className="text-sm text-slate-400 py-2">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function GroupCard({
  group, categories, accountId, year, month, transactions, allGroups
}: {
  group: CategoryGroupRecord
  categories: CategoryWithStats[]
  accountId: string
  year: number
  month: number
  transactions: (Transaction & { entered_by?: string | null })[]
  allGroups: CategoryGroupRecord[]
}) {
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(group.name)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  const totalBudget = categories.reduce((s, c) => s + c.budget_amount, 0)
  const totalActual = categories.reduce((s, c) => s + c.actual_amount, 0)
  const isOver = totalActual > totalBudget && totalBudget > 0

  function handleRename() {
    if (!nameInput.trim() || nameInput === group.name) { setEditingName(false); return }
    startTransition(async () => {
      await updateCategoryGroup(group.id, nameInput.trim(), accountId)
      setEditingName(false)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteCategoryGroup(group.id, accountId)
    })
  }

  return (
    <>
      <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-sm overflow-hidden flex flex-col">
        {/* Card header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]">
          {editingName ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="flex-1 text-sm font-semibold border-b border-indigo-300 bg-transparent focus:outline-none text-right"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false) }}
              />
              <button onClick={handleRename} className="p-1 text-emerald-500"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setEditingName(false)} className="p-1 text-slate-400"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-sm font-semibold text-slate-800 dark:text-white truncate">{group.name}</span>
              {totalBudget > 0 && (
                <span className={`text-xs ${isOver ? 'text-rose-500' : 'text-slate-400'} shrink-0`}>
                  {formatILS(totalActual)}/{formatILS(totalBudget)}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={() => setShowAddCategory(true)} className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors" title="הוסף קטגוריה">
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setNameInput(group.name); setEditingName(true) }} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors" title="שנה שם">
              <Pencil className="w-3 h-3" />
            </button>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors" title="מחק קבוצה">
                <Trash2 className="w-3 h-3" />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button onClick={handleDelete} disabled={isPending} className="text-xs text-rose-600 font-bold px-1">מחק</button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-slate-400 px-1">ביטול</button>
              </div>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="flex-1 py-1">
          {categories.length === 0 ? (
            <button onClick={() => setShowAddCategory(true)} className="w-full py-4 text-xs text-slate-400 hover:text-indigo-500 transition-colors text-center">
              + הוסף קטגוריה ראשונה
            </button>
          ) : (
            categories.map((cat) => (
              <CategoryRow key={cat.id} category={cat} accountId={accountId} year={year} month={month} />
            ))
          )}
        </div>
      </div>

      {showAddCategory && (
        <AddCategoryDialog
          type="expense"
          accountId={accountId}
          year={year}
          month={month}
          defaultGroupId={group.id}
          groups={allGroups}
          onClose={() => setShowAddCategory(false)}
        />
      )}
    </>
  )
}

export default function CategoryGroupsGrid({ groups, expenseCategories, incomeCategories, accountId, year, month, transactions }: Props) {
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleCreateGroup() {
    if (!newGroupName.trim()) return
    startTransition(async () => {
      await createCategoryGroup(accountId, newGroupName.trim())
      setNewGroupName('')
      setShowNewGroup(false)
    })
  }

  // Map categories to their groups
  const catsByGroup: Record<string, CategoryWithStats[]> = {}
  for (const cat of expenseCategories) {
    const key = cat.group_id ?? '__ungrouped__'
    if (!catsByGroup[key]) catsByGroup[key] = []
    catsByGroup[key].push(cat)
  }

  return (
    <div className="space-y-4">
      {/* Groups grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            categories={catsByGroup[group.id] ?? []}
            accountId={accountId}
            year={year}
            month={month}
            transactions={transactions}
            allGroups={groups}
          />
        ))}

        {/* Ungrouped */}
        {(catsByGroup['__ungrouped__'] ?? []).length > 0 && (
          <div className="bg-white dark:bg-card rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08] shadow-sm overflow-hidden">
            <div className="px-3 py-2.5 border-b border-slate-100 dark:border-white/[0.06]">
              <span className="text-sm font-semibold text-slate-400">ללא קבוצה</span>
            </div>
            <div className="py-1">
              {catsByGroup['__ungrouped__'].map((cat) => (
                <CategoryRow key={cat.id} category={cat} accountId={accountId} year={year} month={month} />
              ))}
            </div>
          </div>
        )}

        {/* New group card */}
        {showNewGroup ? (
          <div className="bg-white dark:bg-card rounded-2xl border-2 border-indigo-300 shadow-sm p-4 flex flex-col gap-3">
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="שם הקבוצה..."
              className="w-full text-sm border-b border-indigo-300 bg-transparent focus:outline-none text-right pb-1"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateGroup(); if (e.key === 'Escape') setShowNewGroup(false) }}
            />
            <div className="flex gap-2">
              <button onClick={handleCreateGroup} disabled={isPending || !newGroupName.trim()}
                className="flex-1 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {isPending ? 'יוצר...' : 'צור קבוצה'}
              </button>
              <button onClick={() => setShowNewGroup(false)} className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg">
                ביטול
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewGroup(true)}
            className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/[0.1] hover:border-indigo-300 dark:hover:border-indigo-700 p-6 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-500 transition-colors min-h-[120px]"
          >
            <FolderPlus className="w-6 h-6" />
            <span className="text-sm font-medium">קבוצה חדשה</span>
          </button>
        )}
      </div>
    </div>
  )
}
