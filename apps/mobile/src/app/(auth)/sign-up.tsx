import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AuthShell } from '@/components/auth/auth-shell';
import { AuthTopBar } from '@/components/auth/auth-top-bar';
import { PasswordField } from '@/components/auth/password-field';
import { LocationFields, type LocationValues } from '@/components/profile/location-fields';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { signUpWithEmail } from '@/features/auth/auth-service';
import { isStrongPassword, isValidEmail, normalizeEmail } from '@/features/auth/email';
import { profileSchema } from '@/features/profile/profile-schema';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing } from '@/theme/tokens';

const emptyLocation: LocationValues = {
  cityId: null,
  cityName: '',
  customCity: '',
  neighborhoodId: null,
  neighborhoodName: '',
  customNeighborhood: '',
};

export default function SignUpScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isConfigured } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [location, setLocation] = useState<LocationValues>(emptyLocation);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createAccount = async () => {
    const profileResult = profileSchema.safeParse({
      ...location,
      displayName,
      preferredLanguage: i18n.language === 'en' ? 'en' : 'fr',
    });
    if (!profileResult.success) {
      setError(t('emailAuth.locationIncomplete'));
      return;
    }
    if (!isValidEmail(email)) {
      setError(t('emailAuth.invalidEmail'));
      return;
    }
    if (!isStrongPassword(password)) {
      setError(t('emailAuth.passwordPolicy'));
      return;
    }
    if (password !== passwordConfirmation) {
      setError(t('emailAuth.passwordMismatch'));
      return;
    }

    setLoading(true);
    setError(null);
    const normalizedEmail = normalizeEmail(email);
    try {
      await signUpWithEmail(normalizedEmail, password, profileResult.data);
      router.push({ pathname: '/(auth)/verify-email', params: { email: normalizedEmail } });
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      header={<AuthTopBar onBack={() => router.back()} backLabel={t('common.cancel')} />}
      footer={<AppText variant="caption" color={colors.muted} style={styles.terms}>{t('auth.terms')}</AppText>}
    >
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.stepBadge}>
            <SymbolView name="person.crop.circle.badge.plus" size={15} tintColor={colors.orange} />
            <AppText variant="caption" color={colors.orange} style={styles.stepText}>{t('emailAuth.freeAccount')}</AppText>
          </View>
          <AppText variant="display" style={styles.title}>{t('emailAuth.signUpTitle')}</AppText>
          <AppText color={colors.slate} style={styles.subtitle}>{t('emailAuth.signUpSubtitle')}</AppText>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionNumber}><AppText variant="caption" color={colors.orange}>1</AppText></View>
            <View style={styles.sectionCopy}>
              <AppText variant="bodyStrong">{t('emailAuth.identitySection')}</AppText>
              <AppText variant="caption" color={colors.slate}>{t('emailAuth.identityHint')}</AppText>
            </View>
          </View>
          <TextField
            label={t('profile.nameLabel')}
            placeholder={t('profile.namePlaceholder')}
            value={displayName}
            onChangeText={(value) => { setDisplayName(value); setError(null); }}
            autoCapitalize="words"
            textContentType="name"
            maxLength={50}
          />
          <LocationFields value={location} onChange={(value) => { setLocation(value); setError(null); }} />
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionNumber}><AppText variant="caption" color={colors.orange}>2</AppText></View>
            <View style={styles.sectionCopy}>
              <AppText variant="bodyStrong">{t('emailAuth.securitySection')}</AppText>
              <AppText variant="caption" color={colors.slate}>{t('emailAuth.securityHint')}</AppText>
            </View>
          </View>
          <TextField
            label={t('emailAuth.emailLabel')}
            value={email}
            placeholder={t('emailAuth.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            onChangeText={(value) => { setEmail(value); setError(null); }}
          />
          <PasswordField
            label={t('emailAuth.passwordLabel')}
            value={password}
            placeholder={t('emailAuth.passwordPlaceholder')}
            onChangeText={(value) => { setPassword(value); setError(null); }}
            returnKeyType="next"
          />
          <View style={styles.passwordHint}>
            <SymbolView name="checkmark.shield.fill" size={15} tintColor={colors.success} />
            <AppText variant="caption" color={colors.slate} style={styles.passwordHintText}>{t('emailAuth.passwordPolicy')}</AppText>
          </View>
          <PasswordField
            label={t('emailAuth.confirmPasswordLabel')}
            value={passwordConfirmation}
            placeholder={t('emailAuth.confirmPasswordPlaceholder')}
            onChangeText={(value) => { setPasswordConfirmation(value); setError(null); }}
            onSubmitEditing={() => void createAccount()}
          />
        </View>

        {error ? <AppText color={colors.danger} accessibilityRole="alert">{error}</AppText> : null}
        <Button
          label={t('emailAuth.createMyAccount')}
          trailingIcon="arrow.right"
          loading={loading}
          disabled={!isConfigured}
          onPress={() => void createAccount()}
        />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: spacing.lg, paddingTop: spacing.sm },
  hero: { gap: spacing.sm },
  stepBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: radii.pill, backgroundColor: colors.orangeSoft, paddingHorizontal: 10, paddingVertical: 7 },
  stepText: { fontSize: 10, letterSpacing: 0.7 },
  title: { fontSize: 34, lineHeight: 41, letterSpacing: -1 },
  subtitle: { maxWidth: 390, fontSize: 14, lineHeight: 22 },
  card: { gap: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: 'rgba(255,255,255,0.95)', padding: spacing.lg },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionNumber: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: colors.orangeSoft },
  sectionCopy: { flex: 1, gap: 2 },
  passwordHint: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: -spacing.sm },
  passwordHintText: { flex: 1, lineHeight: 18 },
  terms: { textAlign: 'center', lineHeight: 18, paddingHorizontal: spacing.md },
});
