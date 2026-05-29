import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { usersApi, mediaUrl } from '../api'
import type { UserShort } from '../types'

const STORAGE_KEY = 'search_recent'

function loadRecent(): UserShort[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}
function saveRecent(list: UserShort[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 10)))
}

interface Props {
  onClose: () => void
}

export default function SearchPanel({ onClose }: Props) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [recent, setRecent] = useState<UserShort[]>(loadRecent)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const { data: results = [] } = useQuery({
    queryKey: ['search', q],
    queryFn: async () => {
      if (!q.trim()) return []
      const { data } = await usersApi.search(q.trim())
      return data as UserShort[]
    },
    enabled: q.trim().length > 0,
  })

  function goToProfile(user: UserShort) {
    const updated = [user, ...recent.filter(r => r.id !== user.id)]
    setRecent(updated)
    saveRecent(updated)
    onClose()
    navigate(`/profile/${user.username}`)
  }

  function removeRecent(id: number) {
    const updated = recent.filter(r => r.id !== id)
    setRecent(updated)
    saveRecent(updated)
  }

  function clearAll() {
    setRecent([])
    saveRecent([])
  }

  const showResults = q.trim().length > 0
  const list = showResults ? results : recent

  return (
    <div style={{
      position: 'fixed', left: 72, top: 0, bottom: 0,
      width: 340,
      background: 'var(--bg)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      zIndex: 150,
      boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
    }}>
      {/* Header */}
      <div style={{ padding: '28px 24px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Поиск</h2>
          <button onClick={onClose} style={{ color: 'var(--text)', display: 'flex', padding: 4 }}>
            <X size={22} />
          </button>
        </div>

        {/* Input */}
        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Поиск"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--input-bg)',
              border: 'none', borderRadius: 10,
              padding: '10px 36px 10px 16px',
              fontSize: 15, color: 'var(--text)', outline: 'none',
            }}
          />
          {q && (
            <button
              onClick={() => setQ('')}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                width: 18, height: 18, borderRadius: '50%',
                background: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={11} color="var(--bg)" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', marginBottom: 8 }} />

      {/* Section label */}
      {!showResults && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 24px 10px' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Недавние</span>
          {recent.length > 0 && (
            <button onClick={clearAll} style={{ color: '#0095f6', fontWeight: 600, fontSize: 14 }}>
              Очистить все
            </button>
          )}
        </div>
      )}

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1 }} className="no-scroll">
        {list.length === 0 && !showResults && (
          <p style={{ color: 'var(--text2)', fontSize: 14, textAlign: 'center', marginTop: 32 }}>
            Нет недавних поисков
          </p>
        )}
        {list.length === 0 && showResults && (
          <p style={{ color: 'var(--text2)', fontSize: 14, textAlign: 'center', marginTop: 32 }}>
            Ничего не найдено
          </p>
        )}
        {list.map(u => (
          <div
            key={u.id}
            onClick={() => goToProfile(u)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 24px', cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--hover)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
          >
            {/* Avatar */}
            <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
              {u.photo
                ? <img src={mediaUrl(u.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--text2)', fontSize: 16 }}>
                    {u.username[0].toUpperCase()}
                  </div>
              }
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.username}</p>
              {u.full_name && (
                <p style={{ color: 'var(--text2)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name}</p>
              )}
            </div>

            {/* Remove (only for recent) */}
            {!showResults && (
              <button
                onClick={e => { e.stopPropagation(); removeRecent(u.id) }}
                style={{ color: 'var(--text2)', display: 'flex', padding: 4, flexShrink: 0 }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
