import PlatformBadge from './PlatformBadge'
import ScoreBadge from './ScoreBadge'
import ImageWithFallback from './ImageWithFallback'
import ActionButtons from './ActionButtons'

export default function PickCard({ pick, isFeatured = false, isFirstRow = false, hideScores = false, onAction }) {
  const {
    title, year, season, genres, platform, availability, poster_path, backdrop_path,
    imdb_score, rt_score, combined_score, rank, tmdb_id, type,
    cast, director, description,
  } = pick

  const titleUrl = tmdb_id
    ? `https://www.themoviedb.org/${type === 'tv' ? 'tv' : 'movie'}/${tmdb_id}`
    : null

  // ─── Cinematic Hero Card ───
  if (isFeatured) {
    const heroImage = backdrop_path || poster_path

    const titleBlock = (
      <h3 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-cream-100 mb-2 sm:drop-shadow-lg line-clamp-2">
        {titleUrl ? <a href={titleUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gold-400 transition-colors">{title}</a> : title}
        {season && <span className="text-xl text-cream-300/60 font-normal ml-3">S{season}</span>}
      </h3>
    )

    const metaBlock = (
      <div className="flex items-center gap-2 text-xs sm:text-sm text-cream-300 mb-3 sm:mb-4 flex-wrap">
        <span>{year}</span>
        {director && (
          <>
            <span className="text-cream-300/30">·</span>
            <span>{director}</span>
          </>
        )}
        <span className="text-cream-300/30">·</span>
        <span>{genres.join(', ')}</span>
        {platform && (
          <>
            <span className="text-cream-300/30">·</span>
            <PlatformBadge platform={platform} url={titleUrl} availability={availability} />
          </>
        )}
      </div>
    )

    return (
      <article className="group relative rounded-xl overflow-hidden col-span-full bg-white/5 sm:bg-transparent">
        {/* ── Mobile split card (< sm) ── */}
        <div className="sm:hidden">
          <div className="relative aspect-video overflow-hidden">
            <ImageWithFallback
              src={heroImage}
              alt={title}
              className="w-full h-full object-cover object-center"
            />
            {!hideScores && (
              <div className="absolute bottom-3 left-3">
                <ScoreBadge imdbScore={imdb_score} rtScore={rt_score} combinedScore={combined_score} size="lg" />
              </div>
            )}
          </div>
          <div className="p-4">
            {titleBlock}
            {metaBlock}
            {description && (
              <p className="text-cream-200/80 leading-relaxed text-sm line-clamp-3">
                {description}
              </p>
            )}
            {cast && cast.length > 0 && (
              <p className="text-xs text-cream-300/40 mt-2 truncate">
                {cast.join(' · ')}
              </p>
            )}
            <div className="mt-3">
              <ActionButtons tmdbId={tmdb_id} size="lg" onAction={onAction} />
            </div>
          </div>
        </div>

        {/* ── Desktop/tablet cinematic overlay (sm+) ── */}
        <div className="hidden sm:block">
          <div className="relative w-full sm:aspect-[21/9] md:aspect-[23/9] overflow-hidden sm:min-h-[280px] md:min-h-[340px]">
            <ImageWithFallback
              src={heroImage}
              alt={title}
              className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-700"
            />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
              <h2 className="font-display md:text-[6vw] lg:text-[5vw] font-bold text-white/[0.07] uppercase tracking-wider text-center leading-none">
                {title}
              </h2>
            </div>

            <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-dark-950)] from-0% via-[var(--color-dark-950)]/80 via-35% to-transparent to-75%" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-dark-950)] via-[var(--color-dark-950)]/20 to-transparent" />

            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 lg:p-12">
              <div className="max-w-xl">
                {!hideScores && (
                  <div className="mb-4">
                    <ScoreBadge imdbScore={imdb_score} rtScore={rt_score} combinedScore={combined_score} size="lg" />
                  </div>
                )}

                {titleBlock}
                {metaBlock}

                <p className="text-cream-200/90 leading-relaxed text-sm md:text-base max-w-lg drop-shadow line-clamp-4 md:line-clamp-5">
                  {description}
                </p>

                {cast && cast.length > 0 && (
                  <p className="text-xs text-cream-300/50 mt-3">
                    {cast.join(' · ')}
                  </p>
                )}

                <div className="mt-4">
                  <ActionButtons tmdbId={tmdb_id} size="lg" onAction={onAction} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    )
  }

  // ─── Glassmorphic Grid Card ───
  return (
    <article className={`group relative rounded-xl overflow-hidden bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/20 hover:-translate-y-1 transition-all duration-300 ${isFirstRow ? 'md:col-span-1' : ''}`}>
      <div className={`relative ${isFirstRow ? 'aspect-[4/3]' : 'aspect-video'} overflow-hidden`}>
        <ImageWithFallback
          src={poster_path || backdrop_path}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-dark-950)]/95 via-[var(--color-dark-950)]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-xs text-cream-200 leading-relaxed line-clamp-3">
              {description}
            </p>
          </div>
        </div>

        {/* Rank badge */}
        {rank != null && (
          <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-dark-950/80 backdrop-blur-sm border border-white/15 flex items-center justify-center">
            <span className="text-sm font-bold font-display text-gold-400">#{rank}</span>
          </div>
        )}

      </div>

      <div className="p-3.5">
        <h3 className="font-display text-base font-semibold text-cream-100 mb-0.5 truncate">
          {titleUrl ? <a href={titleUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gold-400 transition-colors">{title}</a> : title}
          {season && <span className="text-sm text-cream-300/50 font-normal ml-1">S{season}</span>}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-cream-300/70 mb-2.5 flex-wrap">
          <span>{year}</span>
          <span className="text-cream-300/30">·</span>
          <span className="truncate">{genres.slice(0, 2).join(', ')}</span>
          {platform && (
            <>
              <span className="text-cream-300/30">·</span>
              <PlatformBadge platform={platform} url={titleUrl} availability={availability} />
            </>
          )}
        </div>

        <div className="flex items-center justify-between">
          {!hideScores ? <ScoreBadge imdbScore={imdb_score} rtScore={rt_score} combinedScore={combined_score} /> : <span />}
          <ActionButtons tmdbId={tmdb_id} onAction={onAction} />
        </div>
      </div>
    </article>
  )
}
