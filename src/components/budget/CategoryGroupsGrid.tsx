'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Check, X, FolderPlus } from 'lucide-react'
import type { CategoryWithStats, CategoryGroupRecord, Transaction } from '@/lib/types'
import { BUCKETS } from '@/lib/types'
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

// ─── Bucket summary bar ───────────────────────────────────────────────────────

const BUCKET_STYLES = {
  'מחיה':   { bar: 'bg-blue-500',    pill: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' },
  'מותרות': { bar: 'bg-violet-500',  pill: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300' },
  'חסכון':  { bar: 'bg-emerald-500', pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
}

function BucketBar({ categories }: { categories: CategoryWithStats[] }) {
  const totalBudget = categories.reduce((s, c) => s + c.budget_amount, 0)

  const bucketData = BUCKETS.map((bucket) => {
    const cats = categories.filter((c) => c.bucket === bucket)
    const budget = cats.reduce((s, c) => s + c.budget_amount, 0)
    const actual = cats.reduce((s, c) => s + c.actual_amount, 0)
    const pct = totalBudget > 0 ? (budget / totalBudget) * 100 : 0
    return { bucket, budget, actual, pct }
  })

  if (totalBudget === 0) return null

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-sm px-4 py-3">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 text-right">פילוח הוצאות</p>
      {/* Horizontal bar */}
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-3">
        {bucketData.map(({ bucket, pct }) =>
          pct > 0 ? (
            <div
              key={bucket}
              className={`${BUCKET_STYLES[bucket as keyof typeof BUCKET_STYLES].bar} h-full rounded-full`}
              style={{ width: `${pct}%` }}
            />
          ) : null
        )}
      </div>
      {/* Pill badges */}
      <div className="flex gap-2 justify-end flex-wrap">
        {bucketData.map(({ bucket, actual, budget, pct }) =>
          pct > 0 ? (
            <div
              key={bucket}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${BUCKET_STYLES[bucket as keyof typeof BUCKET_STYLES].pill}`}
            >
              <span className="opacity-70">{bucket}</span>
              <span className="font-bold tabular-nums">{formatILS(actual)}</span>
              <span className="opacity-50 tabular-nums">/ {formatILS(budget)}</span>
            </div>
          ) : null
        )}
      </div>
    </div>
  )
}

// ─── Category row ─────────────────────────────────────────────────────────────

function CategoryRow({
  category, accountId, year, month,
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

  const { actual_amount, budget_amount } = category
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
      <div className="group/row flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.04] rounded-xl transition-colors">
        <span className="text-base shrink-0 leading-none">{category.icon ?? '📦'}</span>
        <span className="text-sm font-medium text-slate-100 truncate flex-1 min-w-0">
          {category.name}
        </span>

        {editing ? (
          <div className="flex items-center gap-0.5 shrink-0">
            <input
              type="number"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="w-16 text-xs border border-slate-300 dark:border-white/20 rounded-lg px-1.5 py-0.5 bg-white dark:bg-slate-800 focus:outline-none focus:border-indigo-400 text-right"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveBudget()
                if (e.key === 'Escape') setEditing(false)
              }}
            />
            <button onClick={handleSaveBudget} disabled={isPending} className="p-0.5 text-emerald-500 hover:text-emerald-600">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setEditing(false)} className="p-0.5 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => { setBudgetInput(String(budget_amount)); setEditing(true) }}
              className="flex items-baseline gap-1 tabular-nums"
              title="לחץ לעריכת תקציב"
            >
              {budget_amount > 0 && (
                <>
                  <span className="text-sm font-normal text-white tabular-nums">
                    {formatILS(budget_amount)}
                  </span>
                  <span className="text-slate-500 mx-1">/</span>
                </>
              )}
              <span className={`text-sm font-bold tabular-nums ${
                budget_amount === 0
                  ? 'text-slate-400'
                  : isOver
                    ? 'text-rose-400'
                    : 'text-emerald-400'
              }`}>
                {formatILS(actual_amount)}
              </span>
            </button>
            <button
              onClick={() => setShowEditDialog(true)}
              className="p-0.5 text-slate-300 hover:text-slate-500 dark:hover:text-slate-400 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100 transition-opacity"
              title="ערוך קטגוריה"
            >
              <Pencil className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
      </div>

      {showEditDialog && (
        <CategoryEditDialog
          category={category}
          accountId={accountId}
          onClose={() => setShowEditDialog(false)}
        />
      )}

      {showScopeModal && pendingAmount !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-card rounded-2xl shadow-xl w-full max-w-sm p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1 text-right">איך לשמור?</h3>
            <p className="text-sm text-slate-500 mb-4 text-right">{category.name} → {formatILS(pendingAmount)}</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => saveBudget('month', pendingAmount)}
                disabled={isPending}
                className="w-full px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-sm font-medium text-right hover:bg-indigo-100 transition-colors"
              >
                <p className="font-semibold">החל על חודש זה בלבד</p>
                <p className="text-xs opacity-70 mt-0.5">מהחודש הבא יחזור לסכום הקבוע</p>
              </button>
              <button
                onClick={() => saveBudget('template', pendingAmount)}
                disabled={isPending}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 text-sm font-medium text-right hover:bg-slate-100 transition-colors"
              >
                <p className="font-semibold">החל מעכשיו והלאה</p>
                <p className="text-xs opacity-70 mt-0.5">מעדכן את התקציב הקבוע</p>
              </button>
              <button
                onClick={() => { setShowScopeModal(false); setPendingAmount(null) }}
                className="text-sm text-slate-400 py-2"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Group card ───────────────────────────────────────────────────────────────

function GroupCard({
  group, categories, accountId, year, month, allGroups,
}: {
  group: CategoryGroupRecord
  categories: CategoryWithStats[]
  accountId: string
  year: number
  month: number
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
      <div className="group/card bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-sm overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.02]">
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
            <>
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-sm font-semibold text-slate-800 dark:text-white truncate">{group.name}</span>
                {totalBudget > 0 && (
                  <span className={`text-xs tabular-nums shrink-0 ${isOver ? 'text-rose-500 font-medium' : 'text-slate-400'}`}>
                    {formatILS(totalActual)}/{formatILS(totalBudget)}
                  </span>
                )}
              </div>

              {confirmDelete ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={handleDelete} disabled={isPending} className="text-xs text-rose-600 font-bold px-1.5 py-0.5 rounded hover:bg-rose-50">מחק</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs text-slate-400 px-1.5 py-0.5 rounded hover:bg-slate-100">ביטול</button>
                </div>
              ) : (
                <div className="flex items-center gap-0.5 shrink-0 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/card:opacity-100 transition-opacity">
                  <button
                    onClick={() => setShowAddCategory(true)}
                    className="p-1.5 text-slate-400 hover:text-indigo-500 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                    title="הוסף קטגוריה"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setNameInput(group.name); setEditingName(true) }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                    title="שנה שם"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                    title="מחק קבוצה"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Category list */}
        <div className="flex-1 py-1 px-1">
          {categories.length === 0 ? (
            <button
              onClick={() => setShowAddCategory(true)}
              className="w-full py-4 text-xs text-slate-400 hover:text-indigo-500 transition-colors text-center"
            >
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

// ─── Main grid ────────────────────────────────────────────────────────────────

export default function CategoryGroupsGrid({
  groups, expenseCategories, incomeCategories, accountId, year, month, transactions,
}: Props) {
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

  const catsByGroup: Record<string, CategoryWithStats[]> = {}
  for (const cat of expenseCategories) {
    const key = cat.group_id ?? '__ungrouped__'
    if (!catsByGroup[key]) catsByGroup[key] = []
    catsByGroup[key].push(cat)
  }

  return (
    <div className="space-y-4">
      {/* Bucket summary bar */}
      <BucketBar categories={expenseCategories} />

      {/* Section title + new group button */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setShowNewGroup(true)}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-500 transition-colors"
          title="קבוצה חדשה"
        >
          <FolderPlus className="w-4 h-4" />
          <span>קבוצה חדשה</span>
        </button>
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">תקציב הוצאות חודשיות</h3>
      </div>

      {/* New group inline form */}
      {showNewGroup && (
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
            <button
              onClick={handleCreateGroup}
              disabled={isPending || !newGroupName.trim()}
              className="flex-1 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'יוצר...' : 'צור קבוצה'}
            </button>
            <button
              onClick={() => setShowNewGroup(false)}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Groups grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        {groups.map((group, index) => (
          <div
            key={group.id}
            className="animate-fade-slide-in"
            style={{ animationDelay: `${index * 65}ms` }}
          >
            <GroupCard
              group={group}
              categories={catsByGroup[group.id] ?? []}
              accountId={accountId}
              year={year}
              month={month}
              allGroups={groups}
            />
          </div>
        ))}

        {/* Truly ungrouped — fallback only if fixOrphanCategories hasn't run yet */}
        {(catsByGroup['__ungrouped__'] ?? []).length > 0 && (
          <div
            className="animate-fade-slide-in bg-white dark:bg-card rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08] shadow-sm overflow-hidden"
            style={{ animationDelay: `${groups.length * 65}ms` }}
          >
            <div className="px-3 py-2 border-b border-slate-100 dark:border-white/[0.06]">
              <span className="text-sm font-semibold text-slate-400">ללא קבוצה</span>
            </div>
            <div className="py-1 px-1">
              {catsByGroup['__ungrouped__'].map((cat) => (
                <CategoryRow key={cat.id} category={cat} accountId={accountId} year={year} month={month} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
