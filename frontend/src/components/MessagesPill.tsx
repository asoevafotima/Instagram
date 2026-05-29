import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { chatsApi, mediaUrl } from '../api'
import type { Chat } from '../types'

interface Props {
  position?: 'fixed-right' | 'sticky-bottom'
}

export default function MessagesPill({ position = 'fixed-right' }: Props) {
  const navigate = useNavigate()

  const { data: chats = [] } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const { data } = await chatsApi.getAll()
      return data as Chat[]
    },
    refetchInterval: 30_000,
  })

  const totalUnread = chats.reduce((s, c) => s + (c.unread_count ?? 0), 0)
  const recentAvatars = chats.slice(0, 2).map(c => ({
    photo: c.is_group ? c.photo : c.companion?.photo,
    name: c.is_group ? c.name : c.companion?.username,
  }))

  const style: React.CSSProperties = position === 'fixed-right'
    ? { position: 'fixed', bottom: '8vh', right: 88, zIndex: 30 }
    : { marginBottom: 24, width: 'fit-content' }

  return (
    <button
      onClick={() => navigate('/messages')}
      style={{
        ...style,
        height: 72, paddingLeft: 20, paddingRight: 24,
        borderRadius: 31,
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer', color: 'var(--text)',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0, display: 'flex' }}>
        <Send size={24} strokeWidth={1.8} />
        {totalUnread > 0 && (
          <span style={{
            position: 'absolute', top: -6, right: -6,
            background: '#ed4956', color: '#fff',
            fontSize: 10, fontWeight: 700, borderRadius: 9999,
            minWidth: 17, height: 17, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '0 3px',
          }}>
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </div>
      <span style={{ fontWeight: 600, fontSize: 16, whiteSpace: 'nowrap' }}>Сообщения</span>
      {recentAvatars.length > 0 && (
        <div style={{ display: 'flex', marginLeft: 4 }}>
          {recentAvatars.map((a, i) => (
            <div key={i} style={{
              width: 32, height: 32, borderRadius: '50%',
              overflow: 'hidden', background: 'var(--border)',
              border: '2px solid var(--bg3)',
              marginLeft: i > 0 ? -10 : 0, flexShrink: 0,
            }}>
              {a.photo
                ? <img src={mediaUrl(a.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text2)' }}>{a.name?.[0]?.toUpperCase() ?? '?'}</div>
              }
            </div>
          ))}
        </div>
      )}
    </button>
  )
}
