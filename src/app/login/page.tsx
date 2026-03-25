'use client'

import { useState, useTransition } from 'react'
import { login, signup } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wallet } from 'lucide-react'

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const action = isSignup ? signup : login
      const result = await action(null, formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="min-h-screen flex flex-row-reverse">
      {/* Left panel — branding (visually on the left in RTL) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-indigo-600 to-violet-700 p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-xl p-2">
            <Wallet className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight">כספית</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            ניהול תקציב חכם,<br />בקלות ובנוחות.
          </h1>
          <p className="text-indigo-200 text-lg leading-relaxed">
            עקוב אחרי הכנסות והוצאות, הישאר ביעד, וראה בדיוק לאן הולך הכסף שלך — ביחד.
          </p>
        </div>

        <div className="flex flex-col gap-3 text-sm text-indigo-200">
          <span>✓ חשבון אישי וחשבון משותף</span>
          <span>✓ תקציב חודשי עם היסטוריה</span>
          <span>✓ גרפים ופירוט הוצאות</span>
          <span>✓ תמיכה ב-iOS Shortcuts</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="bg-indigo-100 rounded-xl p-2">
              <Wallet className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-xl font-bold text-indigo-600 tracking-tight">כספית</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            {isSignup ? 'יצירת חשבון' : 'ברוך הבא'}
          </h2>
          <p className="text-slate-500 mb-8 text-sm">
            {isSignup ? 'התחל לעקוב אחרי התקציב שלך היום.' : 'התחבר לחשבון שלך.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div className="space-y-1.5">
                <Label htmlFor="displayName">השם שלך</Label>
                <Input id="displayName" name="displayName" placeholder='למשל: איתי' required autoFocus />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">אימייל</Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" required autoFocus={!isSignup} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={isSignup ? 'לפחות 6 תווים' : '••••••••'}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-11" disabled={isPending}>
              {isPending ? 'רגע...' : isSignup ? 'יצירת חשבון' : 'כניסה'}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            {isSignup ? 'כבר יש לך חשבון?' : 'אין לך חשבון?'}{' '}
            <button
              type="button"
              onClick={() => { setIsSignup(!isSignup); setError(null) }}
              className="text-indigo-600 font-medium hover:underline"
            >
              {isSignup ? 'כניסה' : 'צור חשבון'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
