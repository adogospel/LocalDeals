import { Redirect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { isDeletionConfirmationValid } from '@/features/account/account-rules';
import { deleteAccount } from '@/features/account/account-service';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing } from '@/theme/tokens';

const CONFIRMATION = 'DELETE';

export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { authMode, completeAccountDeletion, isLoading, user } = useAuth();
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoading && (!user || authMode !== 'supabase')) return <Redirect href="/" />;
  if (!user || authMode !== 'supabase') return null;
  const isConfirmed = isDeletionConfirmationValid(confirmation);

  const removeAccount = async () => {
    if (!isConfirmed) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      await completeAccountDeletion();
      router.replace('/(auth)/email');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <Button label={t('common.cancel')} variant="ghost" disabled={deleting} onPress={() => router.back()} />
      <View style={styles.hero}>
        <View style={styles.icon}><SymbolView name="trash.fill" size={29} tintColor={colors.danger} /></View>
        <AppText variant="display">{t('account.deleteTitle')}</AppText>
        <AppText color={colors.slate} style={styles.subtitle}>{t('account.deleteSubtitle')}</AppText>
      </View>

      <View style={styles.impactCard}>
        <ImpactRow text={t('account.deleteIdentity')} />
        <ImpactRow text={t('account.deleteMedia')} />
        <ImpactRow text={t('account.deleteTransactions')} />
        <ImpactRow text={t('account.deleteImmediate')} />
      </View>

      <View style={styles.exportNotice}>
        <SymbolView name="arrow.down.doc.fill" size={19} tintColor={colors.orange} />
        <AppText variant="caption" color={colors.slate} style={styles.noticeCopy}>{t('account.deleteExportFirst')}</AppText>
      </View>

      <TextField
        label={t('account.deleteConfirmationLabel')}
        value={confirmation}
        placeholder={CONFIRMATION}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!deleting}
        onChangeText={(value) => { setConfirmation(value); setError(null); }}
      />
      {error ? <AppText accessibilityRole="alert" color={colors.danger}>{error}</AppText> : null}
      <Button
        label={t('account.deletePermanently')}
        variant="danger"
        loading={deleting}
        disabled={!isConfirmed}
        onPress={() => void removeAccount()}
      />
      <AppText variant="caption" color={colors.muted} style={styles.finalNote}>{t('account.deleteFinalNote')}</AppText>
    </Screen>
  );
}

function ImpactRow({ text }: { text: string }) {
  return (
    <View style={styles.impactRow}>
      <View style={styles.bullet}><SymbolView name="checkmark" size={10} tintColor={colors.surface} /></View>
      <AppText color={colors.slate} style={styles.impactText}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', gap: spacing.lg, paddingBottom: spacing.xxl },
  hero: { gap: spacing.sm },
  icon: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.dangerSoft, marginBottom: spacing.sm },
  subtitle: { maxWidth: 520, lineHeight: 23 },
  impactCard: { gap: spacing.md, borderWidth: 1, borderColor: '#F6C7C7', borderRadius: radii.lg, backgroundColor: colors.surface, padding: spacing.lg },
  impactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bullet: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.danger, marginTop: 1 },
  impactText: { flex: 1, lineHeight: 22 },
  exportNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: radii.md, backgroundColor: colors.orangeSoft, padding: spacing.md },
  noticeCopy: { flex: 1, lineHeight: 19 },
  finalNote: { textAlign: 'center', lineHeight: 18 },
});
