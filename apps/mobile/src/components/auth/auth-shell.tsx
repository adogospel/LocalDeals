import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme/tokens';

type AuthShellProps = PropsWithChildren<{
  header?: ReactNode;
  footer?: ReactNode;
}>;

export function AuthShell({ children, header, footer }: AuthShellProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <View pointerEvents="none" style={styles.decorations}>
        <View style={styles.orangeOrb} />
        <View style={styles.creamOrb} />
        <View style={styles.dotOne} />
        <View style={styles.dotTwo} />
      </View>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {header ? <View style={styles.header}>{header}</View> : null}
          <View style={styles.main}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  header: { minHeight: 68, justifyContent: 'center' },
  main: { flex: 1 },
  footer: { paddingTop: spacing.lg },
  decorations: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  orangeOrb: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    top: -164,
    right: -112,
    backgroundColor: colors.orangeSoft,
  },
  creamOrb: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    bottom: -116,
    left: -92,
    backgroundColor: '#FFF7F1',
  },
  dotOne: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
    top: 132,
    right: 36,
    backgroundColor: colors.orange,
    opacity: 0.28,
  },
  dotTwo: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    top: 164,
    right: 70,
    backgroundColor: colors.orange,
    opacity: 0.18,
  },
});
