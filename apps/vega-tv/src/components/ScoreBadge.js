import { StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme/colors'

// Score scales mirror the web client:
//   combined_score: 0–100 (blended IMDb + TMDB)
//   imdb_score:     0–10  (IMDb rating)
//   rt_score:       0–100 (Rotten Tomatoes, rendered with %)

function tone(value, max) {
  if (value == null) return colors.textDim
  const t = max === 100 ? [80, 60] : [7.5, 6]
  if (value >= t[0]) return colors.scoreHigh
  if (value >= t[1]) return colors.scoreMid
  return colors.scoreLow
}

function asNumber(value) {
  if (value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function ScoreBadgeRow({ combined_score, imdb_score, rt_score, size = 'sm' }) {
  const combined = asNumber(combined_score)
  const imdb = asNumber(imdb_score)
  const rt = asNumber(rt_score)
  if (combined == null && imdb == null && rt == null) return null

  const isLg = size === 'lg'
  const styles = isLg ? lgStyles : smStyles

  return (
    <View style={styles.row}>
      {combined != null ? (
        <View style={styles.combinedWrap}>
          <Text style={[styles.combinedValue, { color: tone(combined, 100) }]}>{Math.round(combined)}</Text>
          <Text style={styles.combinedLabel}>SCORE</Text>
        </View>
      ) : (imdb != null || rt != null) ? (
        <Text style={styles.dash}>—</Text>
      ) : null}
      {imdb != null ? (
        <View style={styles.subWrap}>
          <Text style={styles.subLabel}>IMDb</Text>
          <Text style={[styles.subValue, { color: tone(imdb, 10) }]}>{imdb.toFixed(1)}</Text>
        </View>
      ) : null}
      {rt != null ? (
        <View style={styles.subWrap}>
          <Text style={styles.subLabel}>RT</Text>
          <Text style={[styles.subValue, { color: tone(rt, 100) }]}>{Math.round(rt)}%</Text>
        </View>
      ) : null}
    </View>
  )
}

const baseRow = {
  flexDirection: 'row',
  alignItems: 'center',
  flexWrap: 'wrap',
}
const baseSubWrap = { flexDirection: 'row', alignItems: 'baseline', gap: 4 }
const baseCombinedWrap = { flexDirection: 'row', alignItems: 'baseline', gap: 6 }

const smStyles = StyleSheet.create({
  row: { ...baseRow, gap: 14 },
  combinedWrap: baseCombinedWrap,
  combinedValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  combinedLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  subWrap: baseSubWrap,
  subLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  subValue: { fontSize: 14, fontWeight: '700' },
  dash: { color: colors.textDim, fontSize: 18, fontWeight: '700' },
})

const lgStyles = StyleSheet.create({
  row: { ...baseRow, gap: 20 },
  combinedWrap: { ...baseCombinedWrap, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  combinedValue: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  combinedLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  subWrap: baseSubWrap,
  subLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  subValue: { fontSize: 18, fontWeight: '700' },
  dash: { color: colors.textDim, fontSize: 24, fontWeight: '700' },
})
