import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, sizes, spacing } from '../theme/colors'
import { tmdbImage } from '../api/client'
import { asNumber, tone } from './ScoreBadge'

export function TvCard({ pick, onPress, hasTVPreferredFocus }) {
  const [focused, setFocused] = useState(false)
  const poster = tmdbImage(pick.poster_path, 'w500')
  const scoreValue = asNumber(pick.combined_score)
  const score = scoreValue != null ? Math.round(scoreValue) : null
  const scoreColor = score != null ? tone(score, 100) : null
  const showSeasonPill = pick.season > 1

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
        {score != null ? (
          <View style={[styles.scorePill, { borderColor: scoreColor }]}>
            <Text style={[styles.scorePillText, { color: scoreColor }]}>{score}</Text>
          </View>
        ) : null}
        {showSeasonPill ? (
          <View style={styles.seasonPill}>
            <Text style={styles.seasonPillText}>S{pick.season}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.titleStrip}>
        <Text numberOfLines={2} style={styles.title}>{pick.title}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    // Height comes from content: full-aspect poster + fixed title strip.
    // The strip height is fixed so one- and two-line titles stay aligned.
    width: sizes.cardWidth,
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
  scorePill: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    minWidth: 48,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scorePillText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  seasonPill: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  seasonPillText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  titleStrip: {
    height: 76,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
})
