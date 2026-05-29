import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { notificationsApi, followsApi, mediaUrl, formatTime } from '../api'
import type { Notification } from '../types'

const typeLabel: Record<string, string> = {
  like: 'отметил(а) вашу публикацию.',
  comment: 'прокомментировал(а) вашу публикацию.',
  follow: 'подписался(ась) на вас.',
  mention: 'упомянул(а) вас в комментарии.',
}

interface Props {
  onClose: () => void
}

export default function NotificationsPanel({ onClose }: Props) {
  const navigate = useNavigate()
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
      qc.setQueryData(['notif-count'], { unread_count: 0 })
    },
  })

  useEffect(() => { markAll.mutate() }, [])

  return (
    <div style={{
      position: 'fixed', left: 72, top: 0, bottom: 0,
      width: 340, zIndex: 150,
      background: 'var(--bg)',
      borderRight: '1px solid var(--border)',
      boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '28px 24px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Уведомления</h2>
          <button onClick={onClose} style={{ color: 'var(--text)', display: 'flex', padding: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)' }} />

      <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }} className="no-scroll">
        {notifs.length === 0 ? (
          <p style={{ color: 'var(--text2)', textAlign: 'center', padding: 48, fontSize: 14 }}>Нет уведомлений</p>
        ) : (
          notifs.map(n => (
            <NotifRow
              key={n.id}
              notif={n}
              onNavigate={(path) => { onClose(); navigate(path) }}
            />
          ))
        )}
      </div>
    </div>
  )
}

function NotifRow({ notif: n, onNavigate }: { notif: Notification; onNavigate: (path: string) => void }) {
  const [optimisticFollow, setOptimisticFollow] = useState<boolean | null>(null)

  const { data: followStatus } = useQuery({
    queryKey: ['follow-status', n.from_user.id],
    queryFn: async () => {
      const { data } = await followsApi.getStatus(n.from_user.id)
      return data as { status: 'accepted' | 'pending' | 'none' }
    },
    enabled: n.type === 'follow',
    staleTime: 30_000,
  })

  const isFollowing = optimisticFollow !== null
    ? optimisticFollow
    : followStatus?.status === 'accepted' || followStatus?.status === 'pending'

  function handleFollowBack() {
    const was = isFollowing
    setOptimisticFollow(!was)
    const call = was ? followsApi.unfollow : followsApi.follow
    call(n.from_user.id).catch(() => setOptimisticFollow(was))
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px',
        background: n.is_read ? 'none' : 'var(--hover)',
        marginBottom: 1,
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--hover)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = n.is_read ? 'none' : 'var(--hover)'}
    >
      <div
        onClick={() => onNavigate(`/profile/${n.from_user.username}`)}
        style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)', flexShrink: 0, cursor: 'pointer' }}
      >
        {n.from_user.photo
          ? <img src={mediaUrl(n.from_user.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--text2)', fontSize: 16 }}>{n.from_user.username[0].toUpperCase()}</div>
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, lineHeight: 1.4, margin: 0 }}>
          <span style={{ fontWeight: 600 }}>{n.from_user.username}</span>{' '}
          {typeLabel[n.type] ?? n.type}
        </p>
        <span style={{ color: 'var(--text2)', fontSize: 11 }}>{formatTime(n.created_at)}</span>
      </div>

      {n.type === 'follow' ? (
        <button
          onClick={handleFollowBack}
          style={{
            flexShrink: 0, padding: '7px 14px',
            background: isFollowing ? 'var(--bg3)' : '#0095f6',
            color: isFollowing ? 'var(--text)' : '#fff',
            border: isFollowing ? '1px solid var(--border)' : 'none',
            borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          {isFollowing ? 'Вы подписаны' : 'Подписаться'}
        </button>
      ) : n.entity_id ? (
        <div
          onClick={() => onNavigate(`/post/${n.entity_id}`)}
          style={{
            width: 44, height: 44, flexShrink: 0,
            background: 'var(--bg3)', borderRadius: 4,
            overflow: 'hidden', cursor: 'pointer',
          }}
        >
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--bg3), var(--border))' }} />
        </div>
      ) : null}
    </div>
  )
}
