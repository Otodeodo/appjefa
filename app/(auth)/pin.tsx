import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { hashPin, verifyPin, saveSession, getStoredPinHash, storePinHash } from '@/lib/auth'

const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

export default function PinScreen() {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep] = useState<'enter' | 'create' | 'confirm'>('enter')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    getStoredPinHash().then((hash) => {
      if (!hash) setStep('create')
    })
  }, [])

  function handleDigit(d: string) {
    if (d === '⌫') {
      setPin((p) => p.slice(0, -1))
      return
    }
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    if (next.length === 4) setTimeout(() => handleComplete(next), 100)
  }

  async function handleComplete(fullPin: string) {
    setLoading(true)
    try {
      if (step === 'create') {
        setConfirmPin(fullPin)
        setPin('')
        setStep('confirm')
        setLoading(false)
        return
      }

      if (step === 'confirm') {
        if (fullPin !== confirmPin) {
          Alert.alert('Error', 'Los PINs no coinciden. Intenta de nuevo.')
          setPin('')
          setStep('create')
          setLoading(false)
          return
        }
        const hash = await hashPin(fullPin)
        await storePinHash(hash)
        await saveSession()
        router.replace('/(tabs)')
        return
      }

      const hash = await getStoredPinHash()
      const ok = hash ? await verifyPin(fullPin, hash) : false
      if (ok) {
        await saveSession()
        router.replace('/(tabs)')
      } else {
        Alert.alert('PIN incorrecto', 'Intenta de nuevo.')
        setPin('')
      }
    } finally {
      setLoading(false)
    }
  }

  const title = step === 'create' ? 'Crear PIN'
              : step === 'confirm' ? 'Confirmar PIN'
              : 'Ingresa tu PIN'

  const subtitle = step === 'create' ? 'Elige 4 dígitos para proteger la app'
                 : step === 'confirm' ? 'Repite tu PIN para confirmar'
                 : ''

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <View style={styles.dots}>
        {[0,1,2,3].map((i) => (
          <View key={i} style={[styles.dot, pin.length > i && styles.dotFilled]} />
        ))}
      </View>

      <View style={styles.keypad}>
        {DIGITS.map((d, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.key, d === '' && { opacity: 0 }]}
            onPress={() => d && handleDigit(d)}
            disabled={!d || loading}
          >
            <Text style={styles.keyText}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 32 },
  title:     { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle:  { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 32 },
  dots:      { flexDirection: 'row', gap: 16, marginBottom: 48 },
  dot:       { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#6366f1' },
  dotFilled: { backgroundColor: '#6366f1' },
  keypad:    { flexDirection: 'row', flexWrap: 'wrap', width: 240, justifyContent: 'center', gap: 12 },
  key:       { width: 64, height: 64, borderRadius: 32, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  keyText:   { fontSize: 22, fontWeight: '600', color: '#111827' },
})
