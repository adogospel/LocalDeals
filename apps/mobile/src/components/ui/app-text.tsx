import type { PropsWithChildren } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { colors, typography } from '@/theme/tokens';

type Variant = 'caption' | 'body' | 'bodyStrong' | 'title' | 'display';

const variants: Record<Variant, TextStyle> = {
  caption: { fontFamily: typography.medium, fontSize: 12, lineHeight: 18 },
  body: { fontFamily: typography.regular, fontSize: 15, lineHeight: 23 },
  bodyStrong: { fontFamily: typography.semibold, fontSize: 15, lineHeight: 22 },
  title: { fontFamily: typography.semibold, fontSize: 22, lineHeight: 29 },
  display: { fontFamily: typography.bold, fontSize: 30, lineHeight: 38 },
};

type AppTextProps = PropsWithChildren<
  TextProps & {
    variant?: Variant;
    color?: string;
  }
>;

export function AppText({
  children,
  variant = 'body',
  color = colors.ink,
  style,
  ...props
}: AppTextProps) {
  return (
    <Text {...props} style={[variants[variant], { color }, style]}>
      {children}
    </Text>
  );
}

