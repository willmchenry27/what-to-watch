import { Pressable, StyleSheet, Text } from 'react-native'
import { colors, spacing } from '../theme/colors'

export function ActionButton({ label, active, disabled, tone = 'neutral', onPress, hasTVPreferredFocus }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={({ focused }) => [
        styles.btn,
        active && styles.btnActive,
        tone === 'danger' && active && styles.btnDangerActive,
        focused && styles.btnFocused,
        disabled && styles.btnDisabled,
      ]}
    >
      {({ focused }) => (
        <Text style={[styles.label, active && styles.labelActive, focused && styles.labelFocused, disabled && styles.labelDisabled]}>
          {active ? `✓ ${label}` : label}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.cardBg,
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
    transform: [{ scale: 1.05 }],
  },
  btnDisabled: {
    opacity: 0.4,
  },
  label: {
    color: colors.text,
    fontSize: 15,
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
