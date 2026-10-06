import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { getLegalDocument } from '@/features/account/legal-documents';
import { colors, radii, spacing } from '@/theme/tokens';
import type { LegalDocumentType } from '@/types/database';

export default function LegalDocumentScreen() {
  const { i18n, t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const type = params.type;

  if (type !== 'terms' && type !== 'privacy') return <Redirect href="/" />;
  const document = getLegalDocument(type as LegalDocumentType, i18n.language);

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Button label={t('common.goBack')} variant="ghost" onPress={() => router.back()} />
      </View>
      <View style={styles.hero}>
        <View style={styles.icon}>
          <SymbolView
            name={type === 'privacy' ? 'hand.raised.fill' : 'doc.text.fill'}
            size={28}
            tintColor={colors.orange}
          />
        </View>
        <AppText variant="display">{document.title}</AppText>
        <AppText color={colors.slate} style={styles.summary}>{document.summary}</AppText>
        <View style={styles.versionPill}>
          <AppText variant="caption" color={colors.slate}>
            {t('account.legalVersion', { version: document.version, date: document.effectiveDate })}
          </AppText>
        </View>
      </View>
      <View style={styles.document}>
        {document.sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <AppText variant="title" style={styles.sectionTitle}>{section.title}</AppText>
            {section.paragraphs.map((paragraph) => (
              <AppText key={paragraph} color={colors.slate} style={styles.paragraph}>{paragraph}</AppText>
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', gap: spacing.lg, paddingBottom: spacing.xxl },
  topBar: { alignItems: 'flex-start' },
  hero: { gap: spacing.sm },
  icon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.orangeSoft, marginBottom: spacing.sm },
  summary: { maxWidth: 520, lineHeight: 23 },
  versionPill: { alignSelf: 'flex-start', borderRadius: radii.pill, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8 },
  document: { gap: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, padding: spacing.lg },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 18, lineHeight: 25 },
  paragraph: { lineHeight: 24 },
});
