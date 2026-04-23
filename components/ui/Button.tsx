import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native'

interface ButtonProps {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, style }: ButtonProps) {
  const bg = variant === 'primary' ? '#6366f1'
           : variant === 'danger'  ? '#ef4444'
           : '#f3f4f6'
  const textColor = variant === 'secondary' ? '#374151' : '#fff'

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.base, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }, style]}
    >
      {loading
        ? <ActivityIndicator color={textColor} />
        : <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      }
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base:  { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '600' },
})
