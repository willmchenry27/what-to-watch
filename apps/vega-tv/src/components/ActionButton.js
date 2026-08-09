import { Pressable, StyleSheet, Text } from 'react-native'
import { colors, spacing } from '../theme/colors'

export function ActionButton({
  label,
  active,
  disabled,
  pending,
  tone = 'neutral',
  onPress,
  hasTVPreferredFocus,
}) {
  const unavailable = disabled || pending

  return (
    <Pressable
      onPress={onPress}
      disabled={unavailable}
      hasTVPreferredFocus={hasTVPreferredFocus}
      accessibilityRole="button"
      accessibilityState={{ disabled: unavailable, selected: active, busy: pending }}
      style={({ focused }) => [
        styles.btn,
        active && styles.btnActive,
        tone === 'danger' && active && styles.btnDangerActive,
        focused && styles.btnFocused,
        unavailable && styles.btnDisabled,
      ]}
    >
      {({ focused }) => (
        <Text
          style={[
            styles.label,
            active && styles.labelActive,
            focused && styles.labelFocused,
            unavailable && styles.labelDisabled,
          ]}
        >
          {pending ? 'Working...' : active ? `✓ ${label}` : label}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    minWidth: 148,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.cardBg,
    alignItems: 'center',
  },
  btnActive: {
    backgroundColor: 'rgba(201,168,76,0.18)',
    borderColor: 'rgba(201,168,76,0.55)',
  },
  btnDangerActive: {
    backgroundColor: 'rgba(239,68,68,0.18)',
    borderColor: 'rgba(239,68,68,0.55)',
  },
  btnFocused: {
    borderColor: colors.accent,
    transform: [{ scale: 1.06 }],
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  label: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  labelActive: {
    color: colors.accent,
  },
  labelFocused: {
    color: colors.text,
  },
  labelDisabled: {
    color: colors.textMuted,
  },
})
