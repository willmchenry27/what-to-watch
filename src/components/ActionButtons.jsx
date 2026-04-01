import { useUserActions } from '../hooks/useUserActions.jsx'

const actions = [
  {
    key: 'watch',
    label: 'Watch',
    activeClass: 'text-[var(--color-accent-blue)] bg-[var(--color-accent-blue)]/15 border-[var(--color-accent-blue)]/30',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    ),
    iconFilled: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </>
    ),
  },
  {
    key: 'save',
    label: 'Save',
    activeClass: 'text-[var(--color-gold-400)] bg-[var(--color-gold-400)]/15 border-[var(--color-gold-400)]/30',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
    ),
    iconFilled: (
      <path fill="currentColor" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
    ),
  },
  {
    key: 'seen',
    label: 'Seen',
    activeClass: 'text-[var(--color-accent-green)] bg-[var(--color-accent-green)]/15 border-[var(--color-accent-green)]/30',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    iconFilled: (
      <>
        <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </>
    ),
  },
]

export default function ActionButtons({ tmdbId, size = 'sm' }) {
  const { toggleAction, getActions } = useUserActions()
  const current = getActions(tmdbId)

  const isLg = size === 'lg'

  return (
    <div className="flex items-center gap-1.5">
      {actions.map(({ key, label, activeClass, icon, iconFilled }) => {
        const active = !!current[key]
        return (
          <button
            key={key}
            type="button"
            aria-label={`${active ? 'Remove from' : 'Add to'} ${label}`}
            aria-pressed={active}
            onClick={(e) => {
              e.stopPropagation()
              toggleAction(tmdbId, key)
            }}
            className={`
              ${isLg ? 'w-9 h-9' : 'w-7 h-7'}
              flex items-center justify-center rounded-full
              border transition-all duration-200 cursor-pointer
              ${active
                ? activeClass
                : 'text-cream-300/30 border-transparent hover:text-cream-300/60 hover:bg-white/5 hover:border-white/10'
              }
            `}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className={isLg ? 'w-5 h-5' : 'w-4 h-4'}
            >
              {active ? iconFilled : icon}
            </svg>
          </button>
        )
      })}
    </div>
  )
}
