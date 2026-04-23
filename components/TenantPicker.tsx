import { View, Text, TouchableOpacity, FlatList, Modal, StyleSheet } from 'react-native'
import { useState } from 'react'
import { Tenant } from '@/types/database'

interface TenantPickerProps {
  tenants: Tenant[]
  selectedId: string | null
  onSelect: (tenant: Tenant | null) => void
}

export function TenantPicker({ tenants, selectedId, onSelect }: TenantPickerProps) {
  const [open, setOpen] = useState(false)
  const selected = tenants.find((t) => t.id === selectedId)

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={selected ? styles.selected : styles.placeholder}>
          {selected ? `🏠 ${selected.name} — ${selected.property_name}` : 'Seleccionar inquilino...'}
        </Text>
        <Text>▼</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide">
        <TouchableOpacity style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Seleccionar inquilino</Text>
          <TouchableOpacity style={styles.item} onPress={() => { onSelect(null); setOpen(false) }}>
            <Text style={styles.none}>Sin inquilino</Text>
          </TouchableOpacity>
          <FlatList
            data={tenants}
            keyExtractor={(t) => t.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.item, item.id === selectedId && styles.itemSelected]}
                onPress={() => { onSelect(item); setOpen(false) }}
              >
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemSub}>{item.property_name} · ${item.rent_amount.toLocaleString('es-MX')}/mes</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 14 },
  selected:     { fontSize: 15, color: '#374151', fontWeight: '500' },
  placeholder:  { fontSize: 15, color: '#9ca3af' },
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:        { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  title:        { fontSize: 18, fontWeight: '700', marginBottom: 16, color: '#111827' },
  item:         { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  itemSelected: { backgroundColor: '#eef2ff' },
  itemName:     { fontSize: 15, fontWeight: '600', color: '#374151' },
  itemSub:      { fontSize: 13, color: '#6b7280', marginTop: 2 },
  none:         { fontSize: 15, color: '#9ca3af', fontStyle: 'italic' },
})
