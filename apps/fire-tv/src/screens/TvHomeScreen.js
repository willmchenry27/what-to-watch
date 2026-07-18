import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useGuide } from '../hooks/useGuide'
import { groupPicks } from '../lib/grouping'
import { TvRow } from '../components/TvRow'
import { TvDetailModal } from '../components/TvDetailModal'
import { TvLoading } from '../components/TvLoading'
import { TvError } from '../components/TvError'
import { useUserActions } from '../hooks/useUserActions'
import { colors, spacing } from '../theme/colors'

export function TvHomeScreen() {
  const { status, guide, error } = useGuide()
  const { isAction } = useUserActions()
  const [activePick, setActivePick] = useState(null)

  const visiblePicks = useMemo(() => {
    const picks = guide?.picks ?? []
    return picks.filter(
      (p) => !isAction(p.tmdb_id, 'seen') && !isAction(p.tmdb_id, 'dismiss'),
    )
  }, [guide, isAction])

  const { topRated, freshDrops } = useMemo(
    () => groupPicks(visiblePicks, guide?.week_of),
    [visiblePicks, guide?.week_of],
  )

  if (status === 'loading') return <TvLoading />
  if (status === 'error') return <TvError message={error} />

  const weekLabel = guide?.week_of
    ? new Date(guide.week_of + 'T00:00:00').toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>This week's guide</Text>
          <Text style={styles.brand}>What to Watch</Text>
          {weekLabel ? <Text style={styles.weekLabel}>Week of {weekLabel}</Text> : null}
        </View>
        <TvRow
          title="Top Rated"
          subtitle="Scored by IMDb + TMDB community"
          picks={topRated}
          onSelect={setActivePick}
          preferFirstFocus
        />
        <TvRow
          title="Fresh Drops"
          subtitle="New this week · sorted by buzz"
          picks={freshDrops}
          onSelect={setActivePick}
        />
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
      <TvDetailModal
        pick={activePick}
        visible={Boolean(activePick)}
        onClose={() => setActivePick(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    paddingTop: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 13,
    letterSpacing: 1.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  brand: {
    color: colors.text,
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  weekLabel: {
    color: colors.textMuted,
    fontSize: 16,
  },
})
