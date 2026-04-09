import { Document, Page, View, Text, Font, StyleSheet } from '@react-pdf/renderer'
import type { CategoryWithStats, AIReportData } from '@/lib/types'

Font.register({
  family: 'Heebo',
  fonts: [
    { src: `${typeof window !== 'undefined' ? window.location.origin : ''}/fonts/Heebo-Regular.ttf`, fontWeight: 'normal' },
    { src: `${typeof window !== 'undefined' ? window.location.origin : ''}/fonts/Heebo-Bold.ttf`, fontWeight: 'bold' },
  ],
})

const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

// Heebo font does not support emoji glyphs — strip them to avoid rendering artifacts
function stripEmoji(str: string): string {
  return str.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\uD800-\uDFFF]/gu, '').trim()
}

function formatILS(amount: number) {
  return '₪' + Math.round(amount).toLocaleString('he-IL')
}

const SCORE_COLOR: Record<string, string> = {
  A: '#16a34a', B: '#22c55e', C: '#ca8a04', D: '#ea580c', F: '#dc2626',
}

const IMPACT_LABEL: Record<string, string> = {
  high: 'גבוה', medium: 'בינוני', low: 'נמוך',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Heebo',
    backgroundColor: '#ffffff',
    paddingHorizontal: 40,
    paddingVertical: 36,
    fontSize: 10,
    color: '#1e293b',
  },
  // Header
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1.5 solid #e2e8f0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#3730a3', textAlign: 'right' },
  headerSub: { fontSize: 11, color: '#64748b', marginTop: 3, textAlign: 'right' },
  headerBadge: { backgroundColor: '#eef2ff', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  headerBadgeText: { fontSize: 9, color: '#4f46e5', fontWeight: 'bold' },
  // Summary boxes
  summaryRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 22 },
  summaryBox: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'flex-end' },
  summaryLabel: { fontSize: 9, color: '#64748b', marginBottom: 4, textAlign: 'right' },
  summaryAmount: { fontSize: 18, fontWeight: 'bold', textAlign: 'right' },
  summaryMoM: { fontSize: 8, marginTop: 4, textAlign: 'right' },
  // Section title
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#1e293b', marginBottom: 10, textAlign: 'right', borderBottom: '1 solid #e2e8f0', paddingBottom: 6 },
  // AI insights — outer wrapper
  aiSection: { marginBottom: 22 },
  // Score row
  scoreRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 10, backgroundColor: '#f8fafc', borderRadius: 8, padding: 12 },
  scoreBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center', justifyContent: 'center' },
  scoreLetter: { fontSize: 22, fontWeight: 'bold' },
  tldrText: { flex: 1, fontSize: 9.5, color: '#334155', lineHeight: 1.6, textAlign: 'right' },
  // Highlights
  highlightCard: { backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10, marginBottom: 6, borderLeft: '3 solid #16a34a' },
  highlightTitle: { fontSize: 9.5, fontWeight: 'bold', color: '#15803d', textAlign: 'right', marginBottom: 3 },
  highlightDesc: { fontSize: 9, color: '#374151', textAlign: 'right', lineHeight: 1.5 },
  // Warnings
  warningCard: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 10, marginBottom: 6, borderLeft: '3 solid #dc2626' },
  warningHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  warningCategory: { fontSize: 9.5, fontWeight: 'bold', color: '#991b1b', textAlign: 'right' },
  warningImpact: { fontSize: 7.5, color: '#dc2626', backgroundColor: '#fecaca', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  warningIssue: { fontSize: 9, color: '#374151', textAlign: 'right', lineHeight: 1.5 },
  // Action item
  actionCard: { backgroundColor: '#eff6ff', borderRadius: 8, padding: 10, marginTop: 4, borderLeft: '3 solid #3b82f6' },
  actionLabel: { fontSize: 9, fontWeight: 'bold', color: '#1d4ed8', textAlign: 'right', marginBottom: 4 },
  actionText: { fontSize: 9.5, color: '#1e3a5f', textAlign: 'right', lineHeight: 1.6 },
  // Sub-section headers inside AI block
  aiSubTitle: { fontSize: 10, fontWeight: 'bold', color: '#1e293b', textAlign: 'right', marginBottom: 6, marginTop: 10 },
  // MoM changes
  momRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 5, borderBottom: '0.5 solid #f1f5f9' },
  momName: { fontSize: 9.5, color: '#374151', textAlign: 'right' },
  momBadgeUp: { backgroundColor: '#fef2f2', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  momBadgeDown: { backgroundColor: '#f0fdf4', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  momTextUp: { fontSize: 8.5, color: '#dc2626', fontWeight: 'bold' },
  momTextDown: { fontSize: 8.5, color: '#16a34a', fontWeight: 'bold' },
  // Table
  tableHeader: { flexDirection: 'row-reverse', backgroundColor: '#f8fafc', borderRadius: 6, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 4 },
  tableHeaderText: { fontSize: 9, fontWeight: 'bold', color: '#64748b', textAlign: 'right' },
  tableRow: { flexDirection: 'row-reverse', paddingVertical: 6, paddingHorizontal: 10, borderBottom: '0.5 solid #f1f5f9' },
  tableCellName: { flex: 2.5, fontSize: 9.5, color: '#374151', textAlign: 'right' },
  tableCellNum: { flex: 1, fontSize: 9.5, color: '#374151', textAlign: 'right' },
  tableCellOver: { flex: 1, fontSize: 9.5, color: '#dc2626', textAlign: 'right' },
  tableCellOk: { flex: 1, fontSize: 9.5, color: '#16a34a', textAlign: 'right' },
  // Footer
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row-reverse', justifyContent: 'space-between', borderTop: '0.5 solid #e2e8f0', paddingTop: 8 },
  footerText: { fontSize: 8, color: '#94a3b8' },
})

export interface PDFData {
  year: number
  month: number
  totalIncome: number
  totalExpenses: number
  balance: number
  prevTotalExpenses: number
  prevActuals: Record<string, number>
  expenseCategories: CategoryWithStats[]
  aiReportData: AIReportData | null
}

export default function BudgetPDFDocument({ data }: { data: PDFData }) {
  const { year, month, totalIncome, totalExpenses, balance, prevTotalExpenses, prevActuals, expenseCategories, aiReportData } = data

  // MoM overall
  const momOverall = prevTotalExpenses > 0 ? ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100 : null
  const momDiff = prevTotalExpenses > 0 ? totalExpenses - prevTotalExpenses : null

  // MoM per category — only those with real change
  const catChanges = expenseCategories
    .filter((c) => c.actual_amount > 0 && (prevActuals[c.id] ?? 0) > 0)
    .map((c) => ({
      name: c.name,
      actual: c.actual_amount,
      prev: prevActuals[c.id] ?? 0,
      diff: c.actual_amount - (prevActuals[c.id] ?? 0),
      pct: ((c.actual_amount - (prevActuals[c.id] ?? 0)) / (prevActuals[c.id] ?? 1)) * 100,
    }))
    .filter((c) => Math.abs(c.pct) >= 5)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 8)

  const momSign = momOverall !== null ? (momOverall > 0 ? '+' : '') : ''
  const balanceIsPositive = balance >= 0
  const scoreColor = aiReportData ? (SCORE_COLOR[aiReportData.score] ?? '#64748b') : '#64748b'

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>תקציב-לי</Text>
            <Text style={styles.headerSub}>דוח חודשי — {MONTHS[month - 1]} {year}</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>דוח פיננסי</Text>
          </View>
        </View>

        {/* ── Summary boxes ── */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryBox, { backgroundColor: '#f0fdf4' }]}>
            <Text style={styles.summaryLabel}>סך הכנסות</Text>
            <Text style={[styles.summaryAmount, { color: '#16a34a' }]}>{formatILS(totalIncome)}</Text>
          </View>
          <View style={[styles.summaryBox, { backgroundColor: '#fef2f2' }]}>
            <Text style={styles.summaryLabel}>סך הוצאות</Text>
            <Text style={[styles.summaryAmount, { color: '#dc2626' }]}>{formatILS(totalExpenses)}</Text>
            {momOverall !== null && (
              <Text style={[styles.summaryMoM, { color: momOverall > 0 ? '#dc2626' : '#16a34a' }]}>
                {momSign}{Math.round(momOverall)}% לעומת חודש קודם ({momDiff! > 0 ? '+' : ''}{formatILS(momDiff!)})
              </Text>
            )}
          </View>
          <View style={[styles.summaryBox, { backgroundColor: balanceIsPositive ? '#eff6ff' : '#fff7ed' }]}>
            <Text style={styles.summaryLabel}>יתרה</Text>
            <Text style={[styles.summaryAmount, { color: balanceIsPositive ? '#1d4ed8' : '#ea580c' }]}>{formatILS(balance)}</Text>
          </View>
        </View>

        {/* ── AI Insights ── */}
        {aiReportData && (
          <View style={styles.aiSection}>
            <Text style={styles.sectionTitle}>תובנות AI</Text>

            {/* Score + TLDR */}
            <View style={styles.scoreRow}>
              <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '22' }]}>
                <Text style={[styles.scoreLetter, { color: scoreColor }]}>{aiReportData.score}</Text>
              </View>
              <Text style={styles.tldrText}>{aiReportData.tldr}</Text>
            </View>

            {/* Highlights */}
            {aiReportData.highlights.length > 0 && (
              <View>
                <Text style={styles.aiSubTitle}>מה עבד טוב</Text>
                {aiReportData.highlights.map((h, i) => (
                  <View key={i} style={styles.highlightCard}>
                    <Text style={styles.highlightTitle}>{stripEmoji(h.title)}</Text>
                    <Text style={styles.highlightDesc}>{h.description}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Warnings */}
            {aiReportData.warnings.length > 0 && (
              <View>
                <Text style={styles.aiSubTitle}>נקודות לשיפור</Text>
                {aiReportData.warnings.map((w, i) => (
                  <View key={i} style={styles.warningCard}>
                    <View style={styles.warningHeader}>
                      <Text style={styles.warningCategory}>{w.category}</Text>
                      <Text style={styles.warningImpact}>{IMPACT_LABEL[w.impact] ?? w.impact}</Text>
                    </View>
                    <Text style={styles.warningIssue}>{w.issue}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Action Item */}
            <View style={styles.actionCard}>
              <Text style={styles.actionLabel}>הצעד הבא לחודש הבא</Text>
              <Text style={styles.actionText}>{aiReportData.actionItem}</Text>
            </View>
          </View>
        )}

        {/* ── Per-category budget breakdown ── */}
        {expenseCategories.some((c) => c.actual_amount > 0 || c.budget_amount > 0) && (
          <>
            <Text style={styles.sectionTitle}>פירוט הוצאות</Text>
            <View style={{ marginBottom: 22 }}>
              <View style={{ flexDirection: 'row-reverse', backgroundColor: '#f1f5f9', borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10, marginBottom: 3 }}>
                <Text style={{ flex: 2.5, fontSize: 8, fontWeight: 'bold', color: '#64748b', textAlign: 'right' }}>קטגוריה</Text>
                <Text style={{ flex: 1, fontSize: 8, fontWeight: 'bold', color: '#64748b', textAlign: 'right' }}>תוכנן</Text>
                <Text style={{ flex: 1, fontSize: 8, fontWeight: 'bold', color: '#64748b', textAlign: 'right' }}>בפועל</Text>
                <Text style={{ flex: 1, fontSize: 8, fontWeight: 'bold', color: '#64748b', textAlign: 'right' }}>נותר</Text>
              </View>
              {expenseCategories
                .filter((c) => c.actual_amount > 0 || c.budget_amount > 0)
                .sort((a, b) => b.actual_amount - a.actual_amount)
                .map((cat) => {
                  const remaining = cat.budget_amount - cat.actual_amount
                  const isOver = remaining < 0 && cat.budget_amount > 0
                  return (
                    <View key={cat.id} style={{ flexDirection: 'row-reverse', paddingVertical: 5, paddingHorizontal: 10, borderBottom: '0.5 solid #f1f5f9' }}>
                      <Text style={{ flex: 2.5, fontSize: 9, color: '#374151', textAlign: 'right' }}>{stripEmoji(cat.name)}</Text>
                      <Text style={{ flex: 1, fontSize: 9, color: '#64748b', textAlign: 'right' }}>{cat.budget_amount > 0 ? formatILS(cat.budget_amount) : '—'}</Text>
                      <Text style={{ flex: 1, fontSize: 9, color: '#374151', textAlign: 'right' }}>{formatILS(cat.actual_amount)}</Text>
                      {cat.budget_amount > 0 ? (
                        <Text style={{ flex: 1, fontSize: 9, color: isOver ? '#dc2626' : '#16a34a', textAlign: 'right' }}>
                          {isOver ? '-' : ''}{formatILS(Math.abs(remaining))}
                        </Text>
                      ) : (
                        <Text style={{ flex: 1, fontSize: 9, color: '#94a3b8', textAlign: 'right' }}>—</Text>
                      )}
                    </View>
                  )
                })}
            </View>
          </>
        )}

        {/* ── MoM changes ── */}
        {catChanges.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>שינויים מול חודש קודם</Text>
            {catChanges.map((c) => (
              <View key={c.name} style={styles.momRow}>
                <Text style={styles.momName}>{stripEmoji(c.name)}</Text>
                <View style={c.diff > 0 ? styles.momBadgeUp : styles.momBadgeDown}>
                  <Text style={c.diff > 0 ? styles.momTextUp : styles.momTextDown}>
                    {c.diff > 0 ? '+' : ''}{formatILS(c.diff)} ({c.diff > 0 ? '+' : ''}{Math.round(c.pct)}%)
                  </Text>
                </View>
              </View>
            ))}
            <View style={{ marginBottom: 22 }} />
          </>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>תקציב-לי — {MONTHS[month - 1]} {year}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `עמוד ${pageNumber} מתוך ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
