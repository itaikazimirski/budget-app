import { Document, Page, View, Text, Font, StyleSheet, Svg, Path, Rect, G } from '@react-pdf/renderer'
import type { CategoryWithStats } from '@/lib/types'

Font.register({
  family: 'Heebo',
  fonts: [
    { src: `${typeof window !== 'undefined' ? window.location.origin : ''}/fonts/Heebo-Regular.ttf`, fontWeight: 'normal' },
    { src: `${typeof window !== 'undefined' ? window.location.origin : ''}/fonts/Heebo-Bold.ttf`, fontWeight: 'bold' },
  ],
})

const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

const PIE_GROUPS = [
  { key: 'משק בית', label: 'משק בית', color: '#6366f1' },
  { key: 'ביטוח',   label: 'ביטוחים',  color: '#f59e0b' },
  { key: 'מנוי',    label: 'מנויים',   color: '#10b981' },
  { key: 'שאר',     label: 'שאר',      color: '#94a3b8' },
]

function formatILS(amount: number) {
  return '₪' + Math.round(amount).toLocaleString('he-IL')
}

function pieSlicePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const x1 = cx + r * Math.cos(startAngle)
  const y1 = cy + r * Math.sin(startAngle)
  const x2 = cx + r * Math.cos(endAngle)
  const y2 = cy + r * Math.sin(endAngle)
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`
}

function buildPieData(categories: CategoryWithStats[]) {
  const totals: Record<string, number> = { 'משק בית': 0, 'ביטוח': 0, 'מנוי': 0, 'שאר': 0 }
  for (const cat of categories) {
    if (cat.actual_amount <= 0) continue
    const key = cat.category_group ?? 'שאר'
    if (key in totals) totals[key] += cat.actual_amount
    else totals['שאר'] += cat.actual_amount
  }
  const total = Object.values(totals).reduce((s, v) => s + v, 0)
  if (total === 0) return []
  return PIE_GROUPS
    .filter((g) => totals[g.key] > 0)
    .map((g) => ({ ...g, value: totals[g.key], pct: totals[g.key] / total }))
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
  // Pie + legend
  pieRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 20, marginBottom: 22 },
  legend: { flex: 1, gap: 7 },
  legendItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 4 },
  legendLabel: { fontSize: 10, color: '#374151', textAlign: 'right' },
  legendPct: { fontSize: 9, color: '#94a3b8', marginRight: 3 },
  // AI section
  aiBox: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 22, borderLeft: '3 solid #6366f1' },
  aiText: { fontSize: 9.5, color: '#334155', lineHeight: 1.7, textAlign: 'right' },
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
  aiContent: string
}

export default function BudgetPDFDocument({ data }: { data: PDFData }) {
  const { year, month, totalIncome, totalExpenses, balance, prevTotalExpenses, prevActuals, expenseCategories, aiContent } = data

  // MoM overall
  const momOverall = prevTotalExpenses > 0 ? ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100 : null
  const momDiff = prevTotalExpenses > 0 ? totalExpenses - prevTotalExpenses : null

  // MoM per category — only those with real change
  const catChanges = expenseCategories
    .filter((c) => c.actual_amount > 0 && (prevActuals[c.id] ?? 0) > 0)
    .map((c) => ({
      name: c.name,
      icon: c.icon,
      actual: c.actual_amount,
      prev: prevActuals[c.id] ?? 0,
      diff: c.actual_amount - (prevActuals[c.id] ?? 0),
      pct: ((c.actual_amount - (prevActuals[c.id] ?? 0)) / (prevActuals[c.id] ?? 1)) * 100,
    }))
    .filter((c) => Math.abs(c.pct) >= 5)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 8)

  // Pie chart
  const pieData = buildPieData(expenseCategories)
  const CX = 65, CY = 65, R = 55
  let currentAngle = -Math.PI / 2

  // Table — sorted by actual descending
  const tableRows = [...expenseCategories]
    .filter((c) => c.actual_amount > 0 || c.budget_amount > 0)
    .sort((a, b) => b.actual_amount - a.actual_amount)

  const momSign = momOverall !== null ? (momOverall > 0 ? '+' : '') : ''
  const balanceIsPositive = balance >= 0

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>תקציב-לי</Text>
            <Text style={styles.headerSub}>דוח חודשי — {MONTHS[month - 1]} {year}</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>דוח פיננסי</Text>
          </View>
        </View>

        {/* Summary boxes */}
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

        {/* Pie chart + legend */}
        {pieData.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>חלוקת הוצאות</Text>
            <View style={styles.pieRow}>
              <View style={styles.legend}>
                {pieData.map((g) => (
                  <View key={g.key} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: g.color }]} />
                    <Text style={styles.legendLabel}>{g.label}</Text>
                    <Text style={styles.legendPct}>{Math.round(g.pct * 100)}%</Text>
                    <Text style={[styles.legendLabel, { color: '#94a3b8', fontSize: 9 }]}>{formatILS(g.value)}</Text>
                  </View>
                ))}
              </View>
              <Svg width={130} height={130}>
                {pieData.map((g) => {
                  const sweep = g.pct * 2 * Math.PI
                  const endAngle = currentAngle + sweep
                  const d = pieSlicePath(CX, CY, R, currentAngle, endAngle)
                  currentAngle = endAngle
                  return <Path key={g.key} d={d} fill={g.color} />
                })}
                <G>
                  <Path d={`M ${CX - 25} ${CY} A 25 25 0 1 1 ${CX + 25} ${CY} A 25 25 0 1 1 ${CX - 25} ${CY}`} fill="#ffffff" />
                </G>
              </Svg>
            </View>

            {/* Budget vs Actual totals */}
            {(() => {
              const totalBudget = expenseCategories.reduce((s, c) => s + c.budget_amount, 0)
              const isOver = totalExpenses > totalBudget && totalBudget > 0
              return totalBudget > 0 ? (
                <View style={{ flexDirection: 'row-reverse', gap: 10, marginBottom: 22, marginTop: -10 }}>
                  <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 8, color: '#94a3b8', marginBottom: 3 }}>תוכנן</Text>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#475569' }}>{formatILS(totalBudget)}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 8, color: '#94a3b8', marginBottom: 3 }}>בפועל</Text>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#dc2626' }}>{formatILS(totalExpenses)}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: isOver ? '#fef2f2' : '#f0fdf4', borderRadius: 8, padding: 10, alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 8, color: '#94a3b8', marginBottom: 3 }}>{isOver ? 'חריגה' : 'נותר'}</Text>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: isOver ? '#dc2626' : '#16a34a' }}>
                      {isOver ? '-' : ''}{formatILS(Math.abs(totalBudget - totalExpenses))}
                    </Text>
                  </View>
                </View>
              ) : null
            })()}
          </>
        )}

        {/* AI Report */}
        {aiContent ? (
          <>
            <Text style={styles.sectionTitle}>ניתוח AI</Text>
            <View style={styles.aiBox}>
              <Text style={styles.aiText}>{aiContent}</Text>
            </View>
          </>
        ) : null}

        {/* MoM changes */}
        {catChanges.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>שינויים מול חודש קודם</Text>
            {catChanges.map((c) => (
              <View key={c.name} style={styles.momRow}>
                <Text style={styles.momName}>{c.icon} {c.name}</Text>
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

        {/* Category table */}
        {tableRows.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>פירוט קטגוריות</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2.5 }]}>קטגוריה</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>תקציב</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>בפועל</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>נותר</Text>
            </View>
            {tableRows.map((cat) => {
              const remaining = cat.budget_amount - cat.actual_amount
              const isOver = remaining < 0
              return (
                <View key={cat.id} style={styles.tableRow}>
                  <Text style={styles.tableCellName}>{cat.icon} {cat.name}</Text>
                  <Text style={styles.tableCellNum}>{cat.budget_amount > 0 ? formatILS(cat.budget_amount) : '—'}</Text>
                  <Text style={styles.tableCellNum}>{formatILS(cat.actual_amount)}</Text>
                  {cat.budget_amount > 0 ? (
                    <Text style={isOver ? styles.tableCellOver : styles.tableCellOk}>
                      {isOver ? '-' : ''}{formatILS(Math.abs(remaining))}
                    </Text>
                  ) : (
                    <Text style={styles.tableCellNum}>—</Text>
                  )}
                </View>
              )
            })}
          </>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>תקציב-לי — {MONTHS[month - 1]} {year}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `עמוד ${pageNumber} מתוך ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
