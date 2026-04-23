import { useEffect, useState } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { isSessionValid, getStoredPinHash } from '@/lib/auth'

export default function RootLayout() {
  const [ready, setReady] = useState(false)
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    async function checkAuth() {
      const pinHash = await getStoredPinHash()
      const sessionOk = await isSessionValid()

      const inAuth = segments[0] === '(auth)'

      if (!pinHash || !sessionOk) {
        if (!inAuth) router.replace('/(auth)/pin')
      } else {
        if (inAuth) router.replace('/(tabs)')
      }
      setReady(true)
    }
    checkAuth()
  }, [])

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  return <Slot />
}
