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

const availabilityColors = {
  'free': 'bg-green-500/20 text-green-400 border-green-500/30',
  'rent': 'bg-white/10 text-cream-300 border-white/20',
  'buy': 'bg-white/10 text-cream-300 border-white/20',
  'theaters': 'bg-gold-400/20 text-gold-400 border-gold-400/30',
}

export default function PlatformBadge({ platform, url, availability }) {
  if (!platform) return null

  const colors = availabilityColors[availability]
    || platformColors[platform]
    || 'bg-white/15 text-cream-200 border-white/25'
  const className = `inline-flex items-center px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide rounded border backdrop-blur-sm drop-shadow-lg ${colors}`
  const href = url

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`${className} hover:brightness-125 transition-all`}
      >
        {platform}
      </a>
    )
  }

  return <span className={className}>{platform}</span>
}
