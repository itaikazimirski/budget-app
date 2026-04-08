'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

interface EmojiPickerButtonProps {
  value: string
  onChange: (emoji: string) => void
}

export default function EmojiPickerButton({ value, onChange }: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
      >
        <span className="text-2xl">{value}</span>
        <span className="text-sm text-slate-500">{'שנה אימוג\'י'}</span>
      </button>

      {open && (
        <div className="absolute z-50 bottom-full mb-2 right-0">
          <Suspense fallback={<div className="w-64 h-64 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 text-sm">טוען...</div>}>
            <EmojiPicker
              onEmojiClick={(data) => {
                onChange(data.emoji)
                setOpen(false)
              }}
              searchPlaceholder="חיפוש..."
              width={300}
              height={380}
            />
          </Suspense>
        </div>
      )}
    </div>
  )
}
