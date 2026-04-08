'use client'

import { X } from 'lucide-react'
import type { Transaction } from '@/lib/types'
import { formatILS, formatDate } from '@/lib/budget-utils'

interface TransactionPopupProps {
  title: string
  totalAmount: number
  transactions: Transaction[]
  onClose: () => void
}

export default function TransactionPopup({ title, totalAmount, transactions, onClose }: TransactionPopupProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="text-right">
            <h2 className="font-bold text-slate-900 dark:text-white text-base">{title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{'סה"כ'}: {formatILS(totalAmount)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-3 space-y-2">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between bg-slate-50 dark:bg-secondary rounded-xl px-4 py-3 gap-3">
              <span className="text-xs text-slate-400 shrink-0">{formatDate(tx.date)}</span>
              <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 text-right truncate">{tx.notes ?? '—'}</span>
              <span className={`font-semibold text-sm shrink-0 ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-800 dark:text-white'}`}>
                {tx.type === 'income' ? '+' : ''}{formatILS(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
