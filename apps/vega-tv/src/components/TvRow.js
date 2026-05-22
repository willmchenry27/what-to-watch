import { FlatList, StyleSheet, Text, View } from 'react-native'
import { colors, sizes, spacing } from '../theme/colors'
import { TvCard } from './TvCard'

export function TvRow({ title, subtitle, picks, onSelect, preferFirstFocus }) {
  if (!picks || picks.length === 0) return null
  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <FlatList
        data={picks}
        horizontal
        keyExtractor={(item) => `${item.tmdb_id}-${item.cohort ?? 'x'}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ width: sizes.cardGap }} />}
        renderItem={({ item, index }) => (
          <TvCard
            pick={item}
            onPress={onSelect}
            hasTVPreferredFocus={preferFirstFocus && index === 0}
          />
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    marginBottom: sizes.rowGap,
  },
  header: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
})
