import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6366f1',
        tabBarStyle: { borderTopColor: '#f3f4f6' },
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index"   options={{ title: 'Inicio',    tabBarIcon: () => null }} />
      <Tabs.Screen name="scan"    options={{ title: 'Escanear',  tabBarIcon: () => null }} />
      <Tabs.Screen name="history" options={{ title: 'Historial', tabBarIcon: () => null }} />
      <Tabs.Screen name="export"  options={{ title: 'Exportar',  tabBarIcon: () => null }} />
    </Tabs>
  )
}
