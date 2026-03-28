const platformColors = {
  'Netflix': 'bg-red-500/20 text-red-300 border-red-500/30',
  'Apple TV+': 'bg-gray-400/20 text-gray-200 border-gray-400/30',
  'Max': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'Hulu': 'bg-green-500/20 text-green-300 border-green-500/30',
  'Disney+': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Peacock': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'Amazon Prime Video': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'Paramount+': 'bg-blue-400/20 text-blue-300 border-blue-400/30',
  'Starz': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'Crunchyroll': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'AMC+': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'In Theaters': 'bg-gold-400/20 text-gold-400 border-gold-400/30',
}

export default function PlatformBadge({ platform }) {
  const colors = platformColors[platform] || 'bg-white/10 text-cream-300 border-white/20'

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded border border-white/20 backdrop-blur-sm drop-shadow-md ${colors}`}>
      {platform}
    </span>
  )
}
