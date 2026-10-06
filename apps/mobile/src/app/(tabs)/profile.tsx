import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing } from '@/theme/tokens';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { authMode, profile, user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memberDate = profile?.created_at
    ? new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(new Date(profile.created_at))
    : '';

  const logout = async () => {
    setLoading(true);
    try {
      await signOut();
      router.replace('/');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('profile.viewPublicProfile')}
        disabled={!user}
        onPress={() => user && router.push({ pathname: '/profile/[id]', params: { id: user.id } })}
        style={({ pressed }) => [styles.identity, pressed ? styles.pressed : null]}
      >
        <Avatar path={profile?.avatar_path} name={profile?.display_name} size={96} />
        <AppText variant="title">{profile?.display_name}</AppText>
        <AppText color={colors.slate}>
          {profile?.city}{profile?.neighborhood ? ` · ${profile.neighborhood}` : ''}
        </AppText>
        <AppText variant="caption" color={colors.muted}>{t('profile.memberSince', { date: memberDate })}</AppText>
        <View style={styles.publicProfileLink}>
          <AppText variant="caption" color={colors.orange}>{t('profile.viewPublicProfile')}</AppText>
          <SymbolView name="chevron.right" size={11} tintColor={colors.orange} />
        </View>
      </Pressable>
      <View style={[styles.card, authMode === 'development' && styles.developmentCard]}>
        <AppText variant="bodyStrong">{user?.email ?? user?.phone}</AppText>
        <AppText
          variant="caption"
          color={authMode === 'development' ? colors.orange : colors.success}
        >
          {authMode === 'development'
            ? t('profile.developmentSession')
            : user?.email
              ? t('emailAuth.verifiedEmail')
              : t('auth.verifiedPhone')}
        </AppText>
      </View>
      <View style={styles.menu}>
        <ProfileMenuRow label={t('favorites.title')} symbol="heart.fill" onPress={() => router.push('/favorites')} />
        <View style={styles.separator} />
        <ProfileMenuRow label={t('myListings.title')} symbol="shippingbox.fill" onPress={() => router.push('/my-listings')} />
        <View style={styles.separator} />
        <ProfileMenuRow label={t('deals.title')} symbol="person.2.fill" onPress={() => router.push('/deals')} />
        <View style={styles.separator} />
        <ProfileMenuRow label={t('notifications.title')} symbol="bell.fill" onPress={() => router.push('/notifications')} />
        <View style={styles.separator} />
        <ProfileMenuRow label={t('profile.settings')} symbol="gearshape.fill" onPress={() => router.push('/settings/profile')} />
        <View style={styles.separator} />
        <ProfileMenuRow label={t('account.title')} symbol="hand.raised.fill" onPress={() => router.push('/settings/account')} />
      </View>
      <Button label={t('auth.logout')} variant="danger" loading={loading} onPress={() => void logout()} />
      {error ? <AppText accessibilityRole="alert" color={colors.danger} style={styles.error}>{error}</AppText> : null}
    </Screen>
  );
}

function ProfileMenuRow({ label, symbol, onPress }: { label: string; symbol: SymbolViewProps['name']; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed ? styles.menuRowPressed : null]}>
      <View style={styles.menuIcon}><SymbolView name={symbol} size={18} tintColor={colors.orange} /></View>
      <AppText variant="bodyStrong" style={styles.menuLabel}>{label}</AppText>
      <SymbolView name="chevron.right" size={13} tintColor={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  identity: { alignItems: 'center', gap: spacing.sm, borderRadius: radii.lg, paddingVertical: spacing.lg },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  publicProfileLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  card: { gap: spacing.xs, padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  developmentCard: { borderColor: '#FFD2BA', backgroundColor: colors.orangeSoft },
  menu: { overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface },
  menuRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.md },
  menuRowPressed: { backgroundColor: colors.background },
  menuIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.orangeSoft },
  menuLabel: { flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 66, backgroundColor: colors.border },
  error: { borderRadius: radii.sm, backgroundColor: colors.dangerSoft, padding: spacing.sm, textAlign: 'center' },
});
