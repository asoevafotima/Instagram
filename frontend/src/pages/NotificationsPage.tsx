import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi, mediaUrl, formatTime } from '../api'
import type { Notification } from '../types'

const typeLabel: Record<string, string> = {
  like: 'отметил(а) вашу публикацию.',
  comment: 'прокомментировал(а) вашу публикацию.',
  follow: 'подписался(ась) на вас.',
  mention: 'упомянул(а) вас в комментарии.',
}

export default function NotificationsPage() {
  const qc = useQueryClient()

  const { data: notifs = [], refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await notificationsApi.getAll(0, 50)
      return data as Notification[]
    },
  })

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      refetch()
      // Сбрасываем счётчик в navbar сразу
      qc.setQueryData(['notif-count'], { unread_count: 0 })
    },
  })

  // Помечаем всё прочитанным автоматически при открытии страницы
  useEffect(() => {
    markAll.mutate()
  }, [])

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
      <h2 style={{ fontWeight: 600, fontSize: 18, marginBottom: 24 }}>Уведомления</h2>
      {notifs.length === 0 ? (
        <p style={{ color: 'var(--text2)', textAlign: 'center', padding: 48 }}>Нет уведомлений</p>
      ) : (
        notifs.map(n => (
          <div key={n.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px',
            borderRadius: 8, background: n.is_read ? 'none' : 'var(--hover)',
            marginBottom: 2,
          }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)', flexShrink: 0 }}>
              {n.from_user.photo
                ? <img src={mediaUrl(n.from_user.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--text2)' }}>{n.from_user.username[0].toUpperCase()}</div>
              }
            </div>
            <p style={{ flex: 1, fontSize: 14, lineHeight: 1.4 }}>
              <span style={{ fontWeight: 600 }}>{n.from_user.username}</span>{' '}
              {typeLabel[n.type] ?? n.type}
              <span style={{ color: 'var(--text2)', fontSize: 12 }}> {formatTime(n.created_at)}</span>
            </p>
          </div>
        ))
      )}
    </div>
  )
}
