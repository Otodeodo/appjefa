import * as SecureStore from 'expo-secure-store'
import bcryptjs from 'bcryptjs'
import { supabase } from '@/lib/supabase'

const SESSION_KEY = 'mf_session'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

interface Session {
  token: string
  expiresAt: number
}

export async function hashPin(pin: string): Promise<string> {
  return bcryptjs.hash(pin, 10)
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(pin, hash)
}

export async function saveSession(): Promise<void> {
  const session: Session = {
    token: Math.random().toString(36).slice(2),
    expiresAt: Date.now() + SESSION_DURATION_MS,
  }
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session))
}

export async function isSessionValid(): Promise<boolean> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY)
    if (!raw) return false
    const session: Session = JSON.parse(raw)
    return session.expiresAt > Date.now()
  } catch {
    return false
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY)
}

export async function getStoredPinHash(): Promise<string | null> {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'pin_hash')
    .single()
  if (error || !data) return null
  return data.value
}

export async function storePinHash(hash: string): Promise<void> {
  await supabase
    .from('app_config')
    .upsert({ key: 'pin_hash', value: hash })
}
