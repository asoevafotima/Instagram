import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usersApi, mediaUrl } from '../api'
import { useNavigate } from 'react-router-dom'
import type { UserShort } from '../types'

export default function SearchPage() {
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  const { data: users = [] } = useQuery({
    queryKey: ['search', q],
    queryFn: async () => {
      if (!q.trim()) return []
      const { data } = await usersApi.search(q)
      return data as UserShort[]
    },
    enabled: q.trim().length > 0,
  })

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Поиск"
        style={{
          width: '100%', background: 'var(--input-bg)',
          border: '1px solid var(--border)', borderRadius: 8,
          padding: '12px 16px', fontSize: 15, color: 'var(--text)', outline: 'none',
        }}
      />
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {users.map(u => (
          <div
            key={u.id}
            onClick={() => navigate(`/profile/${u.username}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 8, cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--hover)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)', flexShrink: 0 }}>
              {u.photo
                ? <img src={mediaUrl(u.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontWeight: 700 }}>{u.username[0].toUpperCase()}</div>
              }
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14 }}>{u.username}</p>
              {u.full_name && <p style={{ color: 'var(--text2)', fontSize: 13 }}>{u.full_name}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
