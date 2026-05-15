import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from '../theme/colors'

export function TvLoading() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text style={styles.text}>Loading this week's picks…</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  text: {
    color: colors.textMuted,
    fontSize: 16,
  },
})
