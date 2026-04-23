import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { RentAlertWithTenant } from '@/types/database'

interface RentAlertBannerProps {
  alerts: RentAlertWithTenant[]
  today: Date
  onPress: (alert: RentAlertWithTenant) => void
}

export function RentAlertBanner({ alerts, today, onPress }: RentAlertBannerProps) {
  if (alerts.length === 0) return null

  const alertDaysBefore = 3

  const visible = alerts.filter((a) => {
    const dueDay = a.tenant.rent_due_day
    return today.getDate() >= dueDay - alertDaysBefore
  })

  if (visible.length === 0) return null

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚠️ Rentas pendientes este mes</Text>
      {visible.map((alert) => (
        <TouchableOpacity key={alert.id} style={styles.row} onPress={() => onPress(alert)}>
          <View>
            <Text style={styles.name}>{alert.tenant.name}</Text>
            <Text style={styles.sub}>{alert.tenant.property_name} · Vence día {alert.tenant.rent_due_day}</Text>
          </View>
          <Text style={styles.amount}>${alert.tenant.rent_amount.toLocaleString('es-MX')}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fefce8', borderWidth: 1.5, borderColor: '#fde047', borderRadius: 14, padding: 14, marginBottom: 16 },
  title:     { fontSize: 13, fontWeight: '700', color: '#854d0e', marginBottom: 10 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#fde04780' },
  name:      { fontSize: 14, fontWeight: '600', color: '#713f12' },
  sub:       { fontSize: 12, color: '#92400e', marginTop: 2 },
  amount:    { fontSize: 15, fontWeight: '700', color: '#854d0e' },
})
