import type { Metadata } from 'next'
import { Rubik } from 'next/font/google'
import './globals.css'

const rubik = Rubik({ subsets: ['latin', 'hebrew'], weight: '400' })

export const metadata: Metadata = {
  title: 'תקציב-לי — מעקב תקציב',
  description: 'עקוב אחרי התקציב האישי והמשותף שלך בקלות.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50" style={{ fontFamily: "'Rubik', sans-serif" }}>{children}</body>
    </html>
  )
}
