import { useCallback, useEffect } from 'react'
import { BackHandler, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from '../theme/colors'
import { tmdbImage } from '../api/client'
import { ScoreBadgeRow } from './ScoreBadge'
import { ActionButton } from './ActionButton'
import { useUserActions } from '../hooks/useUserActions'

export function TvDetailModal({ pick, visible, onClose }) {
  const { hasToken, ready, error, isAction, isPending, toggle, clearError } = useUserActions()
  const handleClose = useCallback(() => {
    clearError()
    onClose?.()
  }, [clearError, onClose])

  useEffect(() => {
    if (!visible) return undefined
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose()
      return true
    })
    return () => sub.remove()
  }, [visible, handleClose])

  if (!pick) return null
  const backdrop = tmdbImage(pick.backdrop_path, 'w1280') || tmdbImage(pick.poster_path, 'w780')
  const director = pick.director ? `Directed by ${pick.director}` : null
  const actionAvailable = hasToken && pick.tmdb_id != null
  const saved = isAction(pick.tmdb_id, 'save')
  const seen = isAction(pick.tmdb_id, 'seen')
  const dismissed = isAction(pick.tmdb_id, 'dismiss')
  const savePending = isPending(pick.tmdb_id, 'save')
  const seenPending = isPending(pick.tmdb_id, 'seen')
  const dismissPending = isPending(pick.tmdb_id, 'dismiss')

  async function handleAction(actionType) {
    const result = await toggle(pick.tmdb_id, actionType)
    if (result?.active && (actionType === 'seen' || actionType === 'dismiss')) {
      handleClose()
    }
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
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
            {error ? <Text style={styles.actionError}>{error}</Text> : null}
            {actionAvailable && !ready ? (
              <Text style={styles.actionStatus}>Loading your actions...</Text>
            ) : null}
            <View style={styles.footerRow}>
              {actionAvailable ? (
                <View style={styles.actionRow}>
                  <ActionButton
                    label="Save"
                    active={saved}
                    disabled={!ready}
                    pending={savePending}
                    onPress={() => handleAction('save')}
                    hasTVPreferredFocus={ready}
                  />
                  <ActionButton
                    label="Seen it"
                    active={seen}
                    disabled={!ready}
                    pending={seenPending}
                    onPress={() => handleAction('seen')}
                  />
                  <ActionButton
                    label="Not for me"
                    tone="danger"
                    active={dismissed}
                    disabled={!ready}
                    pending={dismissPending}
                    onPress={() => handleAction('dismiss')}
                  />
                </View>
              ) : (
                <View />
              )}
              <Pressable
                onPress={handleClose}
                hasTVPreferredFocus={!actionAvailable || !ready}
                accessibilityRole="button"
                style={({ focused }) => [styles.closeBtn, focused && styles.closeBtnFocused]}
              >
                <Text style={styles.closeBtnText}>Close</Text>
              </Pressable>
            </View>
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
    backgroundColor: colors.bgElevated,
    gap: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionStatus: {
    color: colors.textMuted,
    fontSize: 20,
    fontStyle: 'italic',
  },
  actionError: {
    color: '#fca5a5',
    fontSize: 20,
    fontWeight: '600',
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
    minWidth: 130,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.cardBg,
    alignItems: 'center',
  },
  closeBtnFocused: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(201,168,76,0.15)',
    transform: [{ scale: 1.05 }],
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  closeBtnText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
})
