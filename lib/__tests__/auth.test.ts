import * as SecureStore from 'expo-secure-store'
import { hashPin, verifyPin, saveSession, isSessionValid, clearSession } from '../auth'

jest.mock('expo-secure-store')
jest.mock('@/lib/supabase', () => {
  const single = jest.fn(() => Promise.resolve({ data: { key: 'pin_hash', value: 'hashedpin' }, error: null }))
  const eq = jest.fn(() => ({ single }))
  const select = jest.fn(() => ({ eq }))
  const from = jest.fn(() => ({ select }))
  const upsert = jest.fn(() => Promise.resolve({ error: null }))
  return { supabase: { from, upsert } }
})

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>

describe('auth', () => {
  beforeEach(() => jest.clearAllMocks())

  test('hashPin returns non-empty string different from input', async () => {
    const hash = await hashPin('1234')
    expect(hash).toBeTruthy()
    expect(hash).not.toBe('1234')
    expect(hash.length).toBeGreaterThan(20)
  })

  test('verifyPin returns true for correct pin', async () => {
    const hash = await hashPin('1234')
    const result = await verifyPin('1234', hash)
    expect(result).toBe(true)
  })

  test('verifyPin returns false for wrong pin', async () => {
    const hash = await hashPin('1234')
    const result = await verifyPin('9999', hash)
    expect(result).toBe(false)
  })

  test('isSessionValid returns false when no session stored', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null)
    const result = await isSessionValid()
    expect(result).toBe(false)
  })

  test('isSessionValid returns false for expired session', async () => {
    const expired = JSON.stringify({ token: 'abc', expiresAt: Date.now() - 1000 })
    mockSecureStore.getItemAsync.mockResolvedValue(expired)
    const result = await isSessionValid()
    expect(result).toBe(false)
  })

  test('isSessionValid returns true for valid session', async () => {
    const valid = JSON.stringify({ token: 'abc', expiresAt: Date.now() + 1000000 })
    mockSecureStore.getItemAsync.mockResolvedValue(valid)
    const result = await isSessionValid()
    expect(result).toBe(true)
  })

  test('clearSession removes stored session', async () => {
    await clearSession()
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('mf_session')
  })
})
