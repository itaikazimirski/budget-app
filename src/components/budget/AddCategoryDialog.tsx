'use client'

import { useState, useTransition } from 'react'
import { addCategory } from '@/app/actions/categories'
import { CATEGORY_COLORS } from '@/lib/types'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AddCategoryDialogProps {
  type: 'income' | 'expense'
  accountId: string
  onClose: () => void
}

export default function AddCategoryDialog({ type, accountId, onClose }: AddCategoryDialogProps) {
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[type === 'income' ? 4 : 0])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('accountId', accountId)
    fd.set('type', type)
    fd.set('color', selectedColor)
    startTransition(async () => {
      const result = await addCategory(fd)
      if (result?.error) setError(result.error)
      else onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">
            הוסף קטגוריית {type === 'income' ? 'הכנסה' : 'הוצאה'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">שם הקטגוריה</Label>
            <Input
              id="name"
              name="name"
              placeholder={type === 'income' ? 'למשל: משכורת' : 'למשל: מזון'}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="monthlyAmount">תקציב חודשי (₪)</Label>
            <Input id="monthlyAmount" name="monthlyAmount" type="number" min="0" step="0.01" placeholder="0" />
            <p className="text-xs text-slate-400">ניתן לשנות לפי חודש בהמשך.</p>
          </div>

          <div className="space-y-1.5">
            <Label>צבע</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    selectedColor === color ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{error}</div>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">ביטול</Button>
            <Button type="submit" disabled={isPending} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
              {isPending ? 'מוסיף...' : 'הוסף קטגוריה'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
