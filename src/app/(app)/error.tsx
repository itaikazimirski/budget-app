'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    toast.error('שגיאה בטעינת הדף. אנא נסה שוב.')
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <p className="text-4xl">😕</p>
      <h2 className="text-xl font-semibold text-slate-800 dark:text-white">שגיאה בטעינת הדף</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">אירעה שגיאה בלתי צפויה. הנתונים שלך בטוחים.</p>
      <button
        onClick={reset}
        className="mt-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
      >
        נסה שוב
      </button>
    </div>
  )
}
