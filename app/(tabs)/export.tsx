import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { exportToExcel } from '@/lib/export'
import { getMonthStart } from '@/lib/alerts'

const MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = new Date()
  d.setMonth(d.getMonth() - i)
  return {
    label: d.toLocaleString('es-MX', { month: 'long', year: 'numeric' }),
    start: getMonthStart(d),
    end: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0],
  }
})

export default function ExportScreen() {
  const [selected, setSelected] = useState(0)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      await exportToExcel(MONTHS[selected].start, MONTHS[selected].end)
    } catch {
      Alert.alert('Error', 'No se pudo generar el archivo Excel.')
    } finally {
      setExporting(false)
    }
  }

  const m = MONTHS[selected]
  const label = m.label.charAt(0).toUpperCase() + m.label.slice(1)

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>Exportar al contador</Text>
        <Text style={styles.subtitle}>Genera un Excel con todos los movimientos del mes</Text>

        <Text style={styles.sectionLabel}>Selecciona el mes</Text>
        <Card>
          {MONTHS.map((month, i) => {
            const mlabel = month.label.charAt(0).toUpperCase() + month.label.slice(1)
            return (
              <TouchableOpacity
                key={i}
                style={[styles.monthRow, i === selected && styles.monthRowSelected]}
                onPress={() => setSelected(i)}
              >
                <Text style={[styles.monthText, i === selected && styles.monthTextSelected]}>
                  {mlabel}
                </Text>
                {i === selected && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            )
          })}
        </Card>

        <Card style={styles.summary}>
          <Text style={styles.summaryTitle}>📊 {label}</Text>
          <Text style={styles.summaryDates}>{m.start} → {m.end}</Text>
          <Text style={styles.summaryInfo}>2 hojas: Ingresos y Gastos · Totales incluidos</Text>
        </Card>

        <Button
          label={exporting ? 'Generando...' : '📤 Exportar y compartir'}
          onPress={handleExport}
          loading={exporting}
          style={{ marginTop: 8 }}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: '#f9fafb' },
  content:            { flex: 1, padding: 20 },
  title:              { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle:           { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  sectionLabel:       { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  monthRow:           { paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  monthRowSelected:   {},
  monthText:          { fontSize: 15, color: '#374151' },
  monthTextSelected:  { color: '#6366f1', fontWeight: '600' },
  check:              { color: '#6366f1', fontSize: 16, fontWeight: '700' },
  summary:            { marginTop: 16, backgroundColor: '#eef2ff', borderColor: '#6366f1', borderWidth: 1 },
  summaryTitle:       { fontSize: 16, fontWeight: '700', color: '#4338ca', marginBottom: 4 },
  summaryDates:       { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  summaryInfo:        { fontSize: 13, color: '#6b7280' },
})
