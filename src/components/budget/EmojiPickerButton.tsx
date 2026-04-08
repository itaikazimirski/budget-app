'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

interface EmojiPickerButtonProps {
  value: string
  onChange: (emoji: string) => void
}

export default function EmojiPickerButton({ value, onChange }: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node
      const inButton = buttonRef.current?.contains(target)
      const inPicker = pickerRef.current?.contains(target)
      if (!inButton && !inPicker) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleOpen() {
    if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect())
    setOpen((v) => !v)
  }

  const pickerStyle = rect
    ? {
        position: 'fixed' as const,
        bottom: window.innerHeight - rect.top + 8,
        right: window.innerWidth - rect.right,
        zIndex: 9999,
      }
    : {}

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
      >
        <span className="text-2xl">{value}</span>
        <span className="text-sm text-slate-500">{'שנה אימוג\'י'}</span>
      </button>

      {open && rect && createPortal(
        <div ref={pickerRef} style={pickerStyle}>
          <Suspense fallback={
            <div className="w-[300px] h-[380px] bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 text-sm">
              טוען...
            </div>
          }>
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
        </div>,
        document.body
      )}
    </div>
  )
}
