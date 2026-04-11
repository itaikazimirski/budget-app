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

// Heebo does not support emoji glyphs — strip them to avoid rendering artifacts
function stripEmoji(str: string): string {
  return str.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\uD800-\uDFFF]/gu, '').trim()
}

function formatILS(amount: number) {
  return '₪' + Math.round(amount).toLocaleString('he-IL')
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
    paddingBottom: 56,
    fontSize: 10,
    color: '#1e293b',
  },
  // Header
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 14, borderBottom: '1.5 solid #e2e8f0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#3730a3', textAlign: 'right' },
  headerSub: { fontSize: 11, color: '#64748b', marginTop: 3, textAlign: 'right' },
  headerBadge: { backgroundColor: '#eef2ff', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  headerBadgeText: { fontSize: 9, color: '#4f46e5', fontWeight: 'bold' },
  // Summary boxes
  summaryRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 16 },
  summaryBox: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'flex-end' },
  summaryLabel: { fontSize: 9, color: '#64748b', marginBottom: 3, textAlign: 'right' },
  summaryAmount: { fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
  summaryMoM: { fontSize: 7.5, marginTop: 3, textAlign: 'right' },
  // Mood + TLDR dashboard card
  moodCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 14, borderLeft: '3 solid #6366f1' },
  tldrText: { flex: 1, fontSize: 10, color: '#334155', lineHeight: 1.65, textAlign: 'right' },
  // Section title
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#1e293b', marginBottom: 8, textAlign: 'right', borderBottom: '1 solid #e2e8f0', paddingBottom: 5, marginTop: 16 },
  // Insight cards
  highlightCard: { backgroundColor: '#f0fdf4', borderRadius: 8, padding: 9, marginBottom: 5, borderLeft: '3 solid #16a34a' },
  highlightTitle: { fontSize: 9.5, fontWeight: 'bold', color: '#15803d', textAlign: 'right', marginBottom: 2 },
  highlightDesc: { fontSize: 9, color: '#374151', textAlign: 'right', lineHeight: 1.5 },
  warningCard: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 9, marginBottom: 5, borderLeft: '3 solid #dc2626' },
  warningHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  warningCategory: { fontSize: 9.5, fontWeight: 'bold', color: '#991b1b', textAlign: 'right' },
  warningImpact: { fontSize: 7.5, color: '#dc2626', backgroundColor: '#fecaca', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  warningIssue: { fontSize: 9, color: '#374151', textAlign: 'right', lineHeight: 1.5 },
  actionCard: { backgroundColor: '#eff6ff', borderRadius: 8, padding: 10, marginTop: 8, borderLeft: '3 solid #3b82f6' },
  actionLabel: { fontSize: 9, fontWeight: 'bold', color: '#1d4ed8', textAlign: 'right', marginBottom: 3 },
  actionText: { fontSize: 9.5, color: '#1e3a5f', textAlign: 'right', lineHeight: 1.6 },
  // Grouped categories table
  groupHeaderRow: { flexDirection: 'row-reverse', backgroundColor: '#e0e7ff', borderRadius: 5, paddingVertical: 5, paddingHorizontal: 10, marginTop: 8, marginBottom: 1 },
  groupHeaderName: { flex: 2, fontSize: 9, fontWeight: 'bold', color: '#3730a3', textAlign: 'right' },
  groupHeaderCell: { flex: 1, fontSize: 9, fontWeight: 'bold', color: '#3730a3', textAlign: 'right' },
  catTableHeader: { flexDirection: 'row-reverse', backgroundColor: '#f1f5f9', paddingVertical: 4, paddingHorizontal: 10, marginBottom: 1 },
  catHeaderName: { flex: 2, fontSize: 8, fontWeight: 'bold', color: '#64748b', textAlign: 'right' },
  catHeaderCell: { flex: 1, fontSize: 8, fontWeight: 'bold', color: '#64748b', textAlign: 'right' },
  catRow: { flexDirection: 'row-reverse', paddingVertical: 4, paddingHorizontal: 10, borderBottom: '0.5 solid #f1f5f9' },
  catCellName: { flex: 2, fontSize: 9, color: '#374151', textAlign: 'right' },
  catCellNum: { flex: 1, fontSize: 9, color: '#374151', textAlign: 'right' },
  catCellOver: { flex: 1, fontSize: 9, color: '#dc2626', textAlign: 'right' },
  catCellUnder: { flex: 1, fontSize: 9, color: '#16a34a', textAlign: 'right' },
  // Expense details table (full list)
  detailsHeaderRow: { flexDirection: 'row-reverse', backgroundColor: '#f1f5f9', borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10, marginBottom: 2 },
  detailsHeaderName: { flex: 2, fontSize: 8, fontWeight: 'bold', color: '#64748b', textAlign: 'right' },
  detailsHeaderCell: { flex: 1, fontSize: 8, fontWeight: 'bold', color: '#64748b', textAlign: 'right' },
  detailsRow: { flexDirection: 'row-reverse', paddingVertical: 5, paddingHorizontal: 10, borderBottom: '0.5 solid #f1f5f9' },
  detailsCellName: { flex: 2, fontSize: 9, color: '#374151', textAlign: 'right' },
  detailsCellNum: { flex: 1, fontSize: 9, color: '#374151', textAlign: 'right' },
  detailsCellGreen: { flex: 1, fontSize: 9, color: '#16a34a', textAlign: 'right' },
  detailsCellRed: { flex: 1, fontSize: 9, color: '#dc2626', textAlign: 'right' },
  // Investment summary bar
  investBar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 16, borderLeft: '3 solid #16a34a' },
  investLabel: { fontSize: 9.5, color: '#15803d', textAlign: 'right' },
  investAmount: { fontSize: 11, fontWeight: 'bold', color: '#15803d', textAlign: 'right' },
  // MoM
  momRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 5, borderBottom: '0.5 solid #f1f5f9' },
  momName: { fontSize: 9.5, color: '#374151', textAlign: 'right' },
  momBadgeUp: { backgroundColor: '#fef2f2', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  momBadgeDown: { backgroundColor: '#f0fdf4', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  momTextUp: { fontSize: 8.5, color: '#dc2626', fontWeight: 'bold' },
  momTextDown: { fontSize: 8.5, color: '#16a34a', fontWeight: 'bold' },
  // Footer
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, flexDirection: 'row-reverse', justifyContent: 'space-between', borderTop: '0.5 solid #e2e8f0', paddingTop: 6 },
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

  const momOverall = prevTotalExpenses > 0 ? ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100 : null
  const momDiff    = prevTotalExpenses > 0 ? totalExpenses - prevTotalExpenses : null
  const momSign    = momOverall !== null ? (momOverall > 0 ? '+' : '') : ''

  const catChanges = expenseCategories
    .filter((c) => c.actual_amount > 0 && (prevActuals[c.id] ?? 0) > 0)
    .map((c) => ({
      name: c.name,
      diff: c.actual_amount - (prevActuals[c.id] ?? 0),
      pct:  ((c.actual_amount - (prevActuals[c.id] ?? 0)) / (prevActuals[c.id] ?? 1)) * 100,
    }))
    .filter((c) => Math.abs(c.pct) >= 5)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 8)

  const balanceIsPositive = balance >= 0

  const totalInvestments = expenseCategories
    .filter((c) => c.is_investment)
    .reduce((s, c) => s + c.actual_amount, 0)
  const operationalExpenses = totalExpenses - totalInvestments
  const operationalBalance  = totalIncome - operationalExpenses

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.header} wrap={false}>
          <View>
            <Text style={styles.headerTitle}>תקציב-לי</Text>
            <Text style={styles.headerSub}>דוח חודשי — {MONTHS[month - 1]} {year}</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>דוח פיננסי</Text>
          </View>
        </View>

        {/* ── Summary boxes (תזרים) ── */}
        <View style={styles.summaryRow} wrap={false}>
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
            <Text style={styles.summaryLabel}>{totalInvestments > 0 ? 'תזרים תפעולי' : 'תזרים'}</Text>
            <Text style={[styles.summaryAmount, { color: operationalBalance >= 0 ? '#1d4ed8' : '#ea580c' }]}>{formatILS(operationalBalance)}</Text>
            {totalInvestments > 0 && (
              <Text style={[styles.summaryMoM, { color: '#64748b' }]}>ללא השקעות</Text>
            )}
          </View>
        </View>

        {/* ── Investment summary bar ── */}
        {totalInvestments > 0 && (
          <View style={styles.investBar} wrap={false}>
            <Text style={styles.investLabel}>הופנו להשקעות וחיסכון החודש</Text>
            <Text style={styles.investAmount}>{formatILS(totalInvestments)} 📈</Text>
          </View>
        )}

        {/* ── Mood + TLDR ── */}
        {aiReportData && (
          <View style={styles.moodCard} wrap={false}>
            <Text style={styles.tldrText}>{aiReportData.tldr}</Text>
          </View>
        )}

        {/* ── Highlights ── */}
        {aiReportData?.highlights && aiReportData.highlights.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>מה שעבד טוב החודש</Text>
            {aiReportData.highlights.map((h, i) => (
              <View key={i} style={styles.highlightCard} wrap={false}>
                <Text style={styles.highlightTitle}>{stripEmoji(h.title)}</Text>
                <Text style={styles.highlightDesc}>{h.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Warnings ── */}
        {aiReportData?.warnings && aiReportData.warnings.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>דברים שכדאי לשים לב אליהם</Text>
            {aiReportData.warnings.map((w, i) => (
              <View key={i} style={styles.warningCard} wrap={false}>
                <View style={styles.warningHeader}>
                  <Text style={styles.warningCategory}>{w.category}</Text>
                  <Text style={styles.warningImpact}>{IMPACT_LABEL[w.impact] ?? w.impact}</Text>
                </View>
                <Text style={styles.warningIssue}>{w.issue}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Action Item ── */}
        {aiReportData?.actionItem && (
          <View style={styles.actionCard} wrap={false}>
            <Text style={styles.actionLabel}>מחשבה קטנה להמשך</Text>
            <Text style={styles.actionText}>{aiReportData.actionItem}</Text>
          </View>
        )}

        {/* ── Grouped Categories Table (Name | Planned | Actual) ── */}
        {aiReportData?.categorySummary && aiReportData.categorySummary.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>הוצאות לפי קבוצה</Text>
            {aiReportData.categorySummary.map((group, gi) => (
              <View key={gi}>
                {/* Group header row */}
                <View style={styles.groupHeaderRow} wrap={false}>
                  <Text style={styles.groupHeaderName}>{group.groupName}</Text>
                  <Text style={styles.groupHeaderCell}>תוכנן</Text>
                  <Text style={styles.groupHeaderCell}>בפועל</Text>
                </View>
                {/* Category rows */}
                {group.categories.map((cat, ci) => {
                  const isOver = cat.actual > cat.planned && cat.planned > 0
                  return (
                    <View key={ci} style={styles.catRow} wrap={false}>
                      <Text style={styles.catCellName}>{stripEmoji(cat.itemName)}</Text>
                      <Text style={styles.catCellNum}>{formatILS(cat.planned)}</Text>
                      <Text style={isOver ? styles.catCellOver : styles.catCellUnder}>{formatILS(cat.actual)}</Text>
                    </View>
                  )
                })}
              </View>
            ))}
          </View>
        )}

        {/* ── Full Expense Details (פירוט הוצאות מפורט) ── */}
        {aiReportData?.expenseDetails && aiReportData.expenseDetails.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionTitle}>פירוט הוצאות מפורט</Text>
            <View style={styles.detailsHeaderRow} wrap={false}>
              <Text style={styles.detailsHeaderName}>קטגוריה</Text>
              <Text style={styles.detailsHeaderCell}>תוכנן</Text>
              <Text style={styles.detailsHeaderCell}>בפועל</Text>
              <Text style={styles.detailsHeaderCell}>נותר</Text>
            </View>
            {aiReportData.expenseDetails.map((row, i) => {
              const isOver = row.remaining < 0
              return (
                <View key={i} style={styles.detailsRow} wrap={false}>
                  <Text style={styles.detailsCellName}>{stripEmoji(row.itemName)}</Text>
                  <Text style={styles.detailsCellNum}>{formatILS(row.planned)}</Text>
                  <Text style={styles.detailsCellNum}>{formatILS(row.actual)}</Text>
                  <Text style={isOver ? styles.detailsCellRed : styles.detailsCellGreen}>
                    {isOver ? '' : '+'}{formatILS(row.remaining)}
                  </Text>
                </View>
              )
            })}
          </View>
        )}

        {/* ── MoM changes ── */}
        {catChanges.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionTitle}>שינויים מול חודש קודם</Text>
            {catChanges.map((c) => (
              <View key={c.name} style={styles.momRow} wrap={false}>
                <Text style={styles.momName}>{stripEmoji(c.name)}</Text>
                <View style={c.diff > 0 ? styles.momBadgeUp : styles.momBadgeDown}>
                  <Text style={c.diff > 0 ? styles.momTextUp : styles.momTextDown}>
                    {c.diff > 0 ? '+' : ''}{formatILS(c.diff)} ({c.diff > 0 ? '+' : ''}{Math.round(c.pct)}%)
                  </Text>
                </View>
              </View>
            ))}
          </View>
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
