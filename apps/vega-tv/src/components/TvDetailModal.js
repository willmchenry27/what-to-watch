import { useEffect, useRef } from 'react'
import { BackHandler, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from '../theme/colors'
import { tmdbImage } from '../api/client'
import { ScoreBadgeRow } from './ScoreBadge'

export function TvDetailModal({ pick, visible, onClose }) {
  const closeRef = useRef(null)

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
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
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
              <View style={styles.castRow}>
                <Text style={styles.castLabel}>Cast </Text>
                <Text style={[styles.cast, styles.castNames]}>
                  {pick.cast.slice(0, 5).join(', ')}
                </Text>
              </View>
            ) : null}
            {director ? <Text style={styles.director}>{director}</Text> : null}
          </ScrollView>
          <View style={styles.footer}>
            <Pressable
              ref={closeRef}
              onPress={onClose}
              hasTVPreferredFocus
              nextFocusUp={closeRef.current}
              nextFocusDown={closeRef.current}
              nextFocusLeft={closeRef.current}
              nextFocusRight={closeRef.current}
              style={({ focused }) => [styles.closeBtn, focused && styles.closeBtnFocused]}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>
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
    height: '85%',
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
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: colors.bgElevated,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  genres: {
    color: colors.textMuted,
    fontSize: 24,
    letterSpacing: 0.4,
  },
  description: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 40,
    marginTop: spacing.sm,
  },
  castRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    marginTop: spacing.sm,
  },
  cast: {
    color: colors.textMuted,
    fontSize: 24,
  },
  castNames: {
    flex: 1,
  },
  castLabel: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  director: {
    color: colors.textMuted,
    fontSize: 22,
    fontStyle: 'italic',
  },
  closeBtn: {
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: colors.cardBg,
  },
  closeBtnFocused: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(201,168,76,0.15)',
    transform: [{ scale: 1.08 }],
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  closeBtnText: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
})
