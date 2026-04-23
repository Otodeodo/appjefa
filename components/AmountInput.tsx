import { TextInput, Text, View, StyleSheet } from 'react-native'

interface AmountInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function AmountInput({ value, onChange, placeholder = '0.00' }: AmountInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.symbol}>$</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={(text) => {
          const clean = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
          onChange(clean)
        }}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
      />
      <Text style={styles.currency}>MXN</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, height: 56 },
  symbol:    { fontSize: 20, color: '#374151', marginRight: 4 },
  input:     { flex: 1, fontSize: 24, fontWeight: '700', color: '#111827' },
  currency:  { fontSize: 14, color: '#9ca3af', marginLeft: 4 },
})
