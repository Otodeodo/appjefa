import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Transaction } from '@/types/database'
import { CATEGORY_LABEL } from '@/constants/categories'

interface TransactionCardProps {
  transaction: Transaction
  onPress?: () => void
}

export function TransactionCard({ transaction: t, onPress }: TransactionCardProps) {
  const isIncome = t.type === 'ingreso'
  const amountColor = isIncome ? '#10b981' : '#ef4444'
  const sign = isIncome ? '+' : '-'

  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.category}>{CATEGORY_LABEL[t.category]}</Text>
        <Text style={styles.description} numberOfLines={1}>
          {t.tenant?.name ?? t.description ?? '—'}
        </Text>
        <Text style={styles.date}>{t.date} · {t.payment_method}</Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {sign}${t.amount.toLocaleString('es-MX')}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  left:        { flex: 1, marginRight: 12 },
  category:    { fontSize: 14, fontWeight: '600', color: '#374151' },
  description: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  date:        { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  amount:      { fontSize: 16, fontWeight: '700' },
})
