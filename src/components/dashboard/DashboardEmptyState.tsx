'use client'

import Link from 'next/link'

export default function DashboardEmptyState({
  title,
  description,
  primaryLabel,
  primaryHref,
  primaryOnClick,
  secondaryLabel,
  secondaryHref,
}: {
  title: string
  description: string
  primaryLabel: string
  primaryHref?: string
  primaryOnClick?: () => void
  secondaryLabel?: string
  secondaryHref?: string
}) {
  return (
    <div className="opc-panel-soft rounded-xl border-dashed p-10 text-center">
      <div className="text-lg font-medium text-white">{title}</div>
      <p className="mx-auto mt-2 max-w-xl text-sm text-[color:var(--opc-muted)]">{description}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {primaryHref ? (
          <Link
            href={primaryHref}
            className="opc-button-primary px-4 py-2 text-sm"
          >
            {primaryLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={primaryOnClick}
            className="opc-button-primary px-4 py-2 text-sm"
          >
            {primaryLabel}
          </button>
        )}
        {secondaryLabel && secondaryHref && (
          <Link
            href={secondaryHref}
            className="opc-button-secondary px-4 py-2 text-sm"
          >
            {secondaryLabel}
          </Link>
        )}
      </div>
    </div>
  )
}
