import { useUserActions } from '../hooks/useUserActions.jsx'

const actions = [
  {
    key: 'seen',
    label: 'Seen it',
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
  {
    key: 'dismiss',
    label: 'Not for me',
    activeClass: 'text-red-400 bg-red-400/15 border-red-400/30',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    ),
    iconFilled: (
      <>
        <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </>
    ),
  },
  {
    key: 'save',
    label: 'Save it',
    activeClass: 'text-[var(--color-gold-400)] bg-[var(--color-gold-400)]/15 border-[var(--color-gold-400)]/30',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
    ),
    iconFilled: (
      <path fill="currentColor" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
    ),
  },
]

export default function ActionButtons({ tmdbId, size = 'sm', onAction }) {
  const { toggleAction, getActions, hasToken } = useUserActions()
  const current = getActions(tmdbId)

  const isLg = size === 'lg'
  const disabled = !hasToken

  return (
    <div className={`flex items-center ${isLg ? 'gap-2' : 'gap-1.5'}`}>
      {actions.map(({ key, label, activeClass, icon, iconFilled }) => {
        const active = !disabled && !!current[key]
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            aria-label={disabled ? 'Open from your email to sync state' : `${active ? 'Remove from' : 'Add to'} ${label}`}
            aria-pressed={active}
            title={disabled ? 'Open this site from your weekly email to enable actions' : undefined}
            onClick={async (e) => {
              e.stopPropagation()
              if (disabled) return
              await toggleAction(tmdbId, key)
              if (onAction) onAction()
            }}
            className={`
              ${isLg ? 'h-9 px-3 gap-1.5 text-xs font-medium' : 'w-7 h-7'}
              flex items-center justify-center rounded-full
              border transition-all duration-200
              ${disabled
                ? 'text-cream-300/15 border-transparent cursor-not-allowed opacity-50'
                : active
                  ? `cursor-pointer ${activeClass}`
                  : 'cursor-pointer text-cream-300/30 border-transparent hover:text-cream-300/60 hover:bg-white/5 hover:border-white/10'
              }
            `}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className={isLg ? 'w-4 h-4' : 'w-4 h-4'}
            >
              {active ? iconFilled : icon}
            </svg>
            {isLg && <span>{label}</span>}
          </button>
        )
      })}
    </div>
  )
}
