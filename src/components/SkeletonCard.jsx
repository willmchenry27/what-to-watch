export function SkeletonHero() {
  return (
    <div className="relative rounded-xl overflow-hidden col-span-full animate-pulse">
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] md:aspect-[2/1] min-h-[300px] md:min-h-[500px] bg-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-dark-950 via-dark-950/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 lg:p-12">
          <div className="max-w-xl space-y-4">
            <div className="flex gap-3">
              <div className="h-6 w-20 rounded bg-white/10" />
              <div className="h-6 w-24 rounded bg-white/10" />
            </div>
            <div className="h-10 w-72 rounded bg-white/10" />
            <div className="flex gap-2">
              <div className="h-4 w-12 rounded bg-white/8" />
              <div className="h-4 w-20 rounded bg-white/8" />
              <div className="h-4 w-16 rounded bg-white/8" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full max-w-lg rounded bg-white/8" />
              <div className="h-4 w-3/4 max-w-lg rounded bg-white/8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SkeletonGrid({ count = 8, withFirstRow = false }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden bg-white/5 border border-white/10 animate-pulse">
          <div className={`${withFirstRow && i < 4 ? 'aspect-[4/3]' : 'aspect-video'} bg-white/5`} />
          <div className="p-3.5 space-y-2.5">
            <div className="h-5 w-3/4 rounded bg-white/10" />
            <div className="flex gap-2">
              <div className="h-3 w-10 rounded bg-white/8" />
              <div className="h-3 w-16 rounded bg-white/8" />
            </div>
            <div className="flex gap-3">
              <div className="h-5 w-8 rounded bg-white/10" />
              <div className="h-3 w-12 rounded bg-white/8" />
              <div className="h-3 w-12 rounded bg-white/8" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
