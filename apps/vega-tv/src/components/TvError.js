import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from '../theme/colors'
import { API_BASE_URL } from '../api/client'

export function TvError({ message, onRetry }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Couldn't load the guide</Text>
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.hint}>API base: {API_BASE_URL}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          hasTVPreferredFocus
          style={({ focused }) => [styles.btn, focused && styles.btnFocused]}
        >
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  message: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 700,
  },
  hint: {
    color: colors.textDim,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  btn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.cardBg,
  },
  btnFocused: {
    borderColor: colors.accent,
    transform: [{ scale: 1.05 }],
  },
  btnText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
})
