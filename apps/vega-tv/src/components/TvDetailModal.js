import { useEffect } from 'react'
import { BackHandler, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from '../theme/colors'
import { tmdbImage } from '../api/client'
import { ScoreBadgeRow } from './ScoreBadge'

export function TvDetailModal({ pick, visible, onClose }) {
  useEffect(() => {
    if (!visible) return undefined
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose?.()
      return true
    })
    return () => sub.remove()
  }, [visible, onClose])

  if (!pick) return null
  const backdrop = tmdbImage(pick.backdrop_path, 'w1280') || tmdbImage(pick.poster_path, 'w780')
  const director = pick.director ? `Directed by ${pick.director}` : null

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.panel}>
          {backdrop ? (
            <Image source={{ uri: backdrop }} style={styles.backdrop} resizeMode="cover" />
          ) : (
            <View style={[styles.backdrop, styles.backdropFallback]} />
          )}
          <View style={styles.fade} />
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.eyebrow}>
              {pick.platform ?? '—'}
              {pick.year ? ` · ${pick.year}` : ''}
              {pick.type ? ` · ${pick.type === 'tv' ? 'Series' : 'Movie'}` : ''}
              {pick.season > 1 ? ` · S${pick.season}` : ''}
            </Text>
            <Text style={styles.title}>{pick.title}</Text>
            <ScoreBadgeRow
              combined_score={pick.combined_score}
              imdb_score={pick.imdb_score}
              rt_score={pick.rt_score}
              size="lg"
            />
            {pick.genres?.length ? (
              <Text style={styles.genres}>{pick.genres.join(' · ')}</Text>
            ) : null}
            {pick.description ? <Text style={styles.description}>{pick.description}</Text> : null}
            {pick.cast?.length ? (
              <Text style={styles.cast}>
                <Text style={styles.castLabel}>Cast </Text>
                {pick.cast.slice(0, 5).join(', ')}
              </Text>
            ) : null}
            {director ? <Text style={styles.director}>{director}</Text> : null}
            <View style={styles.actionRow}>
              <Pressable
                onPress={onClose}
                hasTVPreferredFocus
                style={({ focused }) => [styles.closeBtn, focused && styles.closeBtnFocused]}
              >
                <Text style={styles.closeBtnText}>Close</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    width: '85%',
    maxWidth: 1100,
    maxHeight: '85%',
    backgroundColor: colors.bgElevated,
    borderRadius: 16,
    overflow: 'hidden',
  },
  backdrop: {
    width: '100%',
    height: 320,
  },
  backdropFallback: {
    backgroundColor: '#1a1a1a',
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 240,
    height: 80,
    backgroundColor: colors.bgElevated,
    opacity: 0.6,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  genres: {
    color: colors.textMuted,
    fontSize: 14,
    letterSpacing: 0.4,
  },
  description: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 26,
    marginTop: spacing.sm,
  },
  cast: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: spacing.sm,
  },
  castLabel: {
    color: colors.text,
    fontWeight: '700',
  },
  director: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  closeBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.cardBg,
  },
  closeBtnFocused: {
    borderColor: colors.accent,
    transform: [{ scale: 1.05 }],
  },
  closeBtnText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
})
