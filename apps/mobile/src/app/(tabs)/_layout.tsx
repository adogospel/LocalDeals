import { Redirect, Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';

import { useAuth } from '@/providers/auth-provider';
import { colors, typography } from '@/theme/tokens';

function TabIcon({ name, color }: { name: SymbolViewProps['name']; color: ColorValue }) {
  return <SymbolView name={name} size={24} tintColor={color} />;
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const { isAuthenticated, profile, isLoading } = useAuth();
  if (!isLoading && (!isAuthenticated || !profile?.onboarding_completed)) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: typography.medium, fontSize: 11 },
        tabBarStyle: { height: 68, paddingTop: 8, paddingBottom: 9, borderTopColor: colors.border, backgroundColor: colors.surface },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('navigation.home'), tabBarIcon: ({ color }) => <TabIcon name="house.fill" color={color} /> }} />
      <Tabs.Screen name="search" options={{ title: t('navigation.search'), tabBarIcon: ({ color }) => <TabIcon name="magnifyingglass" color={color} /> }} />
      <Tabs.Screen name="sell" options={{ title: t('navigation.sell'), tabBarIcon: ({ color }) => <TabIcon name="plus.circle.fill" color={color} /> }} />
      <Tabs.Screen name="messages" options={{ title: t('navigation.messages'), tabBarIcon: ({ color }) => <TabIcon name="message.fill" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('navigation.profile'), tabBarIcon: ({ color }) => <TabIcon name="person.fill" color={color} /> }} />
    </Tabs>
  );
}
