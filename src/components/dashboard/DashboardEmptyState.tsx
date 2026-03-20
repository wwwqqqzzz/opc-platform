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
    <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/30 p-10 text-center">
      <div className="text-lg font-medium text-white">{title}</div>
      <p className="mx-auto mt-2 max-w-xl text-sm text-gray-400">{description}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {primaryHref ? (
          <Link
            href={primaryHref}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
          >
            {primaryLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={primaryOnClick}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
          >
            {primaryLabel}
          </button>
        )}
        {secondaryLabel && secondaryHref && (
          <Link
            href={secondaryHref}
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
          >
            {secondaryLabel}
          </Link>
        )}
      </div>
    </div>
  )
}
