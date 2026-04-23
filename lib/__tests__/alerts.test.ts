import AsyncStorage from '@react-native-async-storage/async-storage'
import { shouldTriggerAlerts, getMonthStart } from '../alerts'

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}))

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>

describe('alerts utils', () => {
  beforeEach(() => jest.clearAllMocks())

  test('getMonthStart returns first day of given date month', () => {
    const result = getMonthStart(new Date('2026-04-15'))
    expect(result).toBe('2026-04-01')
  })

  test('shouldTriggerAlerts returns true when no last run stored', async () => {
    mockStorage.getItem.mockResolvedValue(null)
    const result = await shouldTriggerAlerts()
    expect(result).toBe(true)
  })

  test('shouldTriggerAlerts returns false when last run was today', async () => {
    const today = new Date().toISOString().split('T')[0]
    mockStorage.getItem.mockResolvedValue(today)
    const result = await shouldTriggerAlerts()
    expect(result).toBe(false)
  })

  test('shouldTriggerAlerts returns true when last run was yesterday', async () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]
    mockStorage.getItem.mockResolvedValue(yesterday)
    const result = await shouldTriggerAlerts()
    expect(result).toBe(true)
  })
})
