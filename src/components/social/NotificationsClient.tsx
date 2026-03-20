'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { SocialNotification } from '@/types/social'

export default function NotificationsClient({
  initialNotifications,
}: {
  initialNotifications: SocialNotification[]
}) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const unreadCount = notifications.filter((notification) => !notification.readAt).length

  const markOneRead = async (id: string) => {
    try {
      setPending(id)
      setError(null)
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'markOne',
          id,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to mark notification as read')
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                readAt: new Date().toISOString(),
              }
            : notification
        )
      )
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'Failed to update notification')
    } finally {
      setPending(null)
    }
  }

  const markAllRead = async () => {
    try {
      setPending('all')
      setError(null)
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'markAllRead',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to mark notifications as read')
      }

      const now = new Date().toISOString()
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          readAt: notification.readAt || now,
        }))
      )
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'Failed to update notifications')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-cyan-700/40 bg-cyan-900/20 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm uppercase tracking-wide text-cyan-300">Notification layer</div>
            <div className="mt-1 text-lg font-medium text-white">
              {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
            </div>
            <p className="mt-2 text-sm text-cyan-100/80">
              Mentions, room invites, DM alerts, and moderator updates all flow here.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={pending === 'all' || unreadCount === 0}
            className="rounded-lg border border-cyan-600/60 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-950/30 disabled:opacity-50"
          >
            {pending === 'all' ? 'Updating...' : 'Mark all as read'}
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-rose-700 bg-rose-900/20 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      <section className="rounded-lg border border-gray-700 bg-gray-800 p-5">
        <h2 className="text-xl font-semibold text-white">Recent notifications</h2>
        <div className="mt-4 space-y-3">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-lg border p-4 ${
                  notification.readAt
                    ? 'border-gray-700 bg-gray-900/35'
                    : 'border-cyan-700/50 bg-cyan-950/20'
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-gray-700 px-2 py-1 text-[11px] uppercase tracking-wide text-gray-400">
                        {notification.type}
                      </span>
                      {!notification.readAt && (
                        <span className="rounded-full border border-cyan-700 bg-cyan-900/30 px-2 py-1 text-[11px] uppercase tracking-wide text-cyan-200">
                          Unread
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-base font-medium text-white">{notification.title}</div>
                    {notification.body && (
                      <p className="mt-2 text-sm leading-6 text-gray-400">{notification.body}</p>
                    )}
                    <div className="mt-3 text-xs text-gray-500">
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {notification.href && (
                      <Link
                        href={notification.href}
                        className="rounded-lg border border-gray-600 px-3 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
                      >
                        Open
                      </Link>
                    )}
                    {!notification.readAt && (
                      <button
                        type="button"
                        onClick={() => void markOneRead(notification.id)}
                        disabled={pending === notification.id}
                        className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
                      >
                        {pending === notification.id ? 'Updating...' : 'Mark read'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/20 p-5 text-sm text-gray-500">
              No notifications yet.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
