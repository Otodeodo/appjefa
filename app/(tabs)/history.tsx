import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTransactions } from '@/hooks/useTransactions'
import { TransactionCard } from '@/components/TransactionCard'
import { Card } from '@/components/ui/Card'
import { CATEGORIES } from '@/constants/categories'
import { Category } from '@/types/database'

export default function HistoryScreen() {
  const [categoryFilter, setCategoryFilter] = useState<Category | null>(null)
  const [typeFilter, setTypeFilter] = useState<'ingreso' | 'gasto' | null>(null)

  const { transactions, loading } = useTransactions({
    category: categoryFilter ?? undefined,
    type: typeFilter ?? undefined,
  })

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial</Text>
      </View>

      <View style={styles.filterRow}>
        {([null, 'ingreso', 'gasto'] as const).map((t) => (
          <TouchableOpacity
            key={String(t)}
            style={[styles.filterBtn, typeFilter === t && styles.filterActive]}
            onPress={() => setTypeFilter(t)}
          >
            <Text style={[styles.filterText, typeFilter === t && styles.filterTextActive]}>
              {t === null ? 'Todo' : t === 'ingreso' ? 'Ingresos' : 'Gastos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.catRow}>
        <TouchableOpacity
          style={[styles.catChip, !categoryFilter && styles.catActive]}
          onPress={() => setCategoryFilter(null)}
        >
          <Text style={[styles.catText, !categoryFilter && styles.catTextActive]}>Todas</Text>
        </TouchableOpacity>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[styles.catChip, categoryFilter === c.value && styles.catActive]}
            onPress={() => setCategoryFilter(c.value)}
          >
            <Text style={[styles.catText, categoryFilter === c.value && styles.catTextActive]}>
              {c.emoji} {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <Text style={styles.empty}>Cargando...</Text>
      ) : transactions.length === 0 ? (
        <Text style={styles.empty}>Sin movimientos con este filtro</Text>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 1, borderRadius: 0 }}>
              <TransactionCard transaction={item} />
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#f9fafb' },
  header:          { padding: 20, paddingBottom: 12 },
  title:           { fontSize: 24, fontWeight: '700', color: '#111827' },
  filterRow:       { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  filterBtn:       { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f3f4f6' },
  filterActive:    { backgroundColor: '#6366f1' },
  filterText:      { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  filterTextActive:{ color: '#fff', fontWeight: '600' },
  catRow:          { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  catChip:         { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#f3f4f6' },
  catActive:       { backgroundColor: '#eef2ff', borderWidth: 1.5, borderColor: '#6366f1' },
  catText:         { fontSize: 13, color: '#6b7280' },
  catTextActive:   { color: '#4338ca', fontWeight: '600' },
  list:            { paddingHorizontal: 20, paddingBottom: 40 },
  empty:           { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 15 },
})
