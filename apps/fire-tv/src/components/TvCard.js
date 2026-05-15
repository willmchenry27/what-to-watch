import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, sizes, spacing } from '../theme/colors'
import { tmdbImage } from '../api/client'
import { ScoreBadgeRow } from './ScoreBadge'
import { useUserActions } from '../hooks/useUserActions'

export function TvCard({ pick, onPress, hasTVPreferredFocus }) {
  const [focused, setFocused] = useState(false)
  const { isAction } = useUserActions()
  const saved = isAction(pick.tmdb_id, 'save')
  const poster = tmdbImage(pick.poster_path, 'w500')
  const seasonLabel = pick.season > 1 ? `S${pick.season}` : null

  return (
    <Pressable
      onPress={() => onPress?.(pick)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={({ focused: pf }) => [
        styles.card,
        (focused || pf) && styles.cardFocused,
      ]}
    >
      <View style={styles.posterWrap}>
        {poster ? (
          <Image source={{ uri: poster }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={[styles.poster, styles.posterFallback]}>
            <Text style={styles.posterFallbackText}>{pick.title?.slice(0, 1) ?? '?'}</Text>
          </View>
        )}
        {pick.platform ? (
          <View style={styles.platformPill}>
            <Text style={styles.platformPillText}>{pick.platform}</Text>
          </View>
        ) : null}
        {saved ? (
          <View style={styles.savedPill}>
            <Text style={styles.savedPillText}>★ Saved</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.meta}>
        <Text numberOfLines={1} style={styles.title}>
          {pick.title}
          {seasonLabel ? <Text style={styles.season}> · {seasonLabel}</Text> : null}
        </Text>
        <ScoreBadgeRow
          combined_score={pick.combined_score}
          imdb_score={pick.imdb_score}
          rt_score={pick.rt_score}
        />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    width: sizes.cardWidth,
    height: sizes.cardHeight,
    borderRadius: 12,
    backgroundColor: colors.cardBg,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  cardFocused: {
    borderColor: colors.cardBorderFocused,
    transform: [{ scale: 1.05 }],
    shadowColor: colors.cardBorderFocused,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  posterWrap: {
    width: '100%',
    aspectRatio: sizes.posterAspect,
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterFallbackText: {
    color: colors.textMuted,
    fontSize: 64,
    fontWeight: '700',
  },
  platformPill: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  platformPillText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  savedPill: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(201,168,76,0.92)',
  },
  savedPillText: {
    color: '#0a0a0c',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  meta: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  season: {
    color: colors.accent,
    fontWeight: '600',
  },
})
