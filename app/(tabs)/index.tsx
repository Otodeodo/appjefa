import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useTransactions } from '@/hooks/useTransactions'
import { useRentAlerts } from '@/hooks/useRentAlerts'
import { RentAlertBanner } from '@/components/RentAlertBanner'
import { TransactionCard } from '@/components/TransactionCard'
import { Card } from '@/components/ui/Card'
import { getMonthStart } from '@/lib/alerts'

export default function Dashboard() {
  const router = useRouter()
  const today = new Date()
  const monthStart = getMonthStart(today)
  const monthEnd = today.toISOString().split('T')[0]

  const { transactions, loading } = useTransactions({ startDate: monthStart, endDate: monthEnd })
  const { pendingAlerts } = useRentAlerts()
  const [ownerName, setOwnerName] = useState('Mamá')

  useEffect(() => {
    supabase.from('app_config').select('value').eq('key', 'owner_name').single()
      .then(({ data }) => { if (data) setOwnerName(data.value) })
  }, [])

  const totalIngresos = transactions.filter((t) => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0)
  const totalGastos   = transactions.filter((t) => t.type === 'gasto').reduce((s, t) => s + t.amount, 0)
  const saldo = totalIngresos - totalGastos

  const recent = transactions.slice(0, 10)

  const monthName = today.toLocaleString('es-MX', { month: 'long', year: 'numeric' })

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hola, {ownerName} 👋</Text>
          <Text style={styles.month}>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</Text>
        </View>

        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo del mes</Text>
          <Text style={[styles.balanceAmount, { color: saldo >= 0 ? '#10b981' : '#ef4444' }]}>
            ${Math.abs(saldo).toLocaleString('es-MX')}
          </Text>
          <Text style={styles.balanceSub}>Ingresos − Gastos</Text>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceMini}>Ingresos</Text>
              <Text style={[styles.balanceMiniAmount, { color: '#10b981' }]}>
                +${totalIngresos.toLocaleString('es-MX')}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.balanceMini}>Gastos</Text>
              <Text style={[styles.balanceMiniAmount, { color: '#ef4444' }]}>
                -${totalGastos.toLocaleString('es-MX')}
              </Text>
            </View>
          </View>
        </Card>

        <RentAlertBanner
          alerts={pendingAlerts}
          today={today}
          onPress={() => router.push('/(tabs)/scan')}
        />

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(tabs)/scan')}>
            <Text style={styles.actionIcon}>📷</Text>
            <Text style={styles.actionLabel}>Escanear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f0fdf4' }]} onPress={() => router.push('/(tabs)/scan')}>
            <Text style={styles.actionIcon}>+</Text>
            <Text style={styles.actionLabel}>Ingreso</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Últimos movimientos</Text>
        <Card>
          {loading
            ? <Text style={styles.empty}>Cargando...</Text>
            : recent.length === 0
            ? <Text style={styles.empty}>Sin movimientos este mes</Text>
            : recent.map((t) => <TransactionCard key={t.id} transaction={t} />)
          }
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: '#f9fafb' },
  scroll:            { flex: 1 },
  content:           { padding: 20, paddingBottom: 40 },
  header:            { marginBottom: 20 },
  greeting:          { fontSize: 24, fontWeight: '700', color: '#111827' },
  month:             { fontSize: 14, color: '#6b7280', marginTop: 2 },
  balanceCard:       { marginBottom: 20, alignItems: 'center' },
  balanceLabel:      { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  balanceAmount:     { fontSize: 40, fontWeight: '800', marginBottom: 4 },
  balanceSub:        { fontSize: 12, color: '#9ca3af', marginBottom: 16 },
  balanceRow:        { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  balanceMini:       { fontSize: 12, color: '#6b7280' },
  balanceMiniAmount: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  actions:           { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn:         { flex: 1, backgroundColor: '#eef2ff', borderRadius: 16, padding: 20, alignItems: 'center' },
  actionIcon:        { fontSize: 28, marginBottom: 8 },
  actionLabel:       { fontSize: 15, fontWeight: '600', color: '#4338ca' },
  sectionTitle:      { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 12 },
  empty:             { textAlign: 'center', color: '#9ca3af', paddingVertical: 20 },
})
