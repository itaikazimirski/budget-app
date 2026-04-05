'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { X, Trash2 } from 'lucide-react'
import type { CategoryWithStats } from '@/lib/types'
import { updateCategory, deleteCategory } from '@/app/actions/categories'
import { BUCKETS } from '@/lib/types'
import EmojiPickerButton from './EmojiPickerButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CategoryEditDialogProps {
  category: CategoryWithStats
  accountId: string
  onClose: () => void
  anchor?: DOMRect // when provided → renders as floating popover, no overlay
}

export default function CategoryEditDialog({ category, accountId, onClose, anchor }: CategoryEditDialogProps) {
  const [nameInput, setNameInput] = useState(category.name)
  const [selectedIcon, setSelectedIcon] = useState(category.icon ?? '📦')
  const [selectedBucket, setSelectedBucket] = useState(category.bucket ?? 'מחיה')
  const [selectedGroup, setSelectedGroup] = useState<'מנוי' | 'ביטוח' | 'משק בית' | null>(category.category_group ?? null)
  const [isFixed, setIsFixed] = useState(category.is_fixed ?? false)
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  function handleDelete() {
    startTransition(async () => {
      await deleteCategory(category.id, accountId)
      onClose()
    })
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const fd = new FormData()
      fd.set('categoryId', category.id)
      fd.set('accountId', accountId)
      fd.set('name', nameInput)
      fd.set('icon', selectedIcon)
      fd.set('bucket', selectedBucket)
      if (selectedGroup) fd.set('category_group', selectedGroup)
      fd.set('is_fixed', String(isFixed))
      await updateCategory(fd)
      onClose()
    })
  }

  // Compute position for popover mode
  const popoverStyle = (() => {
    if (!anchor) return {}
    const popoverWidth = 320
    const spaceBelow = window.innerHeight - anchor.bottom
    const top = spaceBelow >= 300
      ? anchor.bottom + 8
      : Math.max(8, anchor.top - 8 - 520)
    // Center the popover under the button, clamped to stay on screen
    const centerX = (anchor.left + anchor.right) / 2
    const left = Math.max(8, Math.min(centerX - popoverWidth / 2, window.innerWidth - popoverWidth - 8))
    return { position: 'fixed' as const, top, left, width: popoverWidth, zIndex: 50 }
  })()

  const form = (
    <form onSubmit={handleSave} className="p-5 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="catName">שם הקטגוריה</Label>
        <Input id="catName" value={nameInput} onChange={(e) => setNameInput(e.target.value)} required autoFocus />
      </div>

      <div className="space-y-1.5">
        <Label>סיווג</Label>
        <div className="flex gap-2">
          {BUCKETS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setSelectedBucket(b)}
              className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                selectedBucket === b
                  ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {category.type === 'expense' && (
        <div className="space-y-1.5">
          <Label>סוג מיוחד (אופציונלי)</Label>
          <div className="flex gap-2">
            {(['מנוי', 'ביטוח'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGroup(selectedGroup === g ? null : g)}
                className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  selectedGroup === g
                    ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-300'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {g === 'מנוי' ? '📺' : '🛡️'} {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {category.type === 'expense' && (
        <button
          type="button"
          onClick={() => setIsFixed(!isFixed)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
            isFixed
              ? 'border-amber-400 bg-amber-50 text-amber-700'
              : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
          }`}
        >
          <div className="text-right">
            <p className="font-medium text-sm">הוצאה קבועה</p>
            <p className="text-xs opacity-70 mt-0.5">לא תופיע באוטומציית השורטקאט</p>
          </div>
          <span className="text-2xl">{isFixed ? '🔒' : '🔓'}</span>
        </button>
      )}

      <div className="space-y-1.5">
        <Label>אייקון</Label>
        <EmojiPickerButton value={selectedIcon} onChange={setSelectedIcon} />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">ביטול</Button>
        <Button type="submit" disabled={isPending} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
          {isPending ? 'שומר...' : 'שמור'}
        </Button>
      </div>

      <div className="border-t border-slate-100 pt-3">
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-600 transition-colors mx-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            מחק קטגוריה
          </button>
        ) : (
          <div className="flex items-center justify-between bg-rose-50 rounded-xl px-4 py-2.5">
            <p className="text-xs text-rose-600 font-medium">למחוק את "{category.name}"?</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-slate-400 hover:text-slate-600">ביטול</button>
              <button type="button" onClick={handleDelete} disabled={isPending} className="text-xs text-rose-600 font-bold hover:text-rose-700">
                {isPending ? '...' : 'מחק'}
              </button>
            </div>
          </div>
        )}
      </div>
    </form>
  )

  // ── Floating popover (no overlay) ──────────────────────────────────────────
  if (anchor) {
    return (
      <>
        {/* Invisible backdrop — click outside closes */}
        <div className="fixed inset-0 z-40" onClick={onClose} />

        <div
          ref={popoverRef}
          style={popoverStyle}
          className="bg-white dark:bg-card rounded-2xl shadow-2xl border border-slate-200 dark:border-white/[0.12] overflow-y-auto max-h-[90vh]"
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">עריכת קטגוריה</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          {form}
        </div>
      </>
    )
  }

  // ── Full-screen modal (default, used elsewhere) ─────────────────────────────
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/30 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-white dark:bg-card rounded-2xl shadow-xl w-full max-w-sm my-8">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/[0.06]">
            <h2 className="font-semibold text-slate-900 dark:text-white">עריכת קטגוריה</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          {form}
        </div>
      </div>
    </div>
  )
}
