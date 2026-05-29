import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, Search, Hash } from 'lucide-react'
import { postsApi, usersApi, tagsApi, mediaUrl } from '../api'
import type { Post } from '../types'
import ReelsViewer from '../components/ReelsViewer'
import MessagesPill from '../components/MessagesPill'

export default function ExplorePage() {
  const navigate   = useNavigate()
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [query,     setQuery]     = useState('')
  const [focused,   setFocused]   = useState(false)

  const isHashtag = query.startsWith('#')
  const cleanQ    = isHashtag ? query.slice(1) : query

  /* user search results */
  const { data: userResults = [] } = useQuery({
    queryKey: ['user-search', cleanQ],
    queryFn: async () => {
      const { data } = await usersApi.search(cleanQ)
      return data as { id: number; username: string; full_name?: string; photo?: string }[]
    },
    enabled: !isHashtag && cleanQ.trim().length >= 1,
    staleTime: 10_000,
  })

  /* hashtag search results */
  const { data: tagResults = [] } = useQuery({
    queryKey: ['tag-search', cleanQ],
    queryFn: async () => {
      const { data } = await tagsApi.search(cleanQ)
      return data as { id: number; name: string; count: number }[]
    },
    enabled: isHashtag && cleanQ.trim().length >= 1,
    staleTime: 10_000,
  })

  /* explore grid */
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['explore'],
    queryFn: async () => {
      const { data } = await postsApi.getExplore(0, 60)
      return data as Post[]
    },
  })

  const showSearch = focused || query.length > 0

  return (
    <div style={{ maxWidth: 935, margin: '0 auto', padding: '8px 0 40px' }}>

      {/* ── Search bar ── */}
      <div style={{ padding: '8px 16px 16px', position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 14px',
          transition: 'border-color 0.15s',
          borderColor: focused ? 'var(--text2)' : 'var(--border)',
        }}>
          <Search size={16} color="var(--text2)" strokeWidth={2} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Поиск"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 15, fontFamily: 'inherit',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', display: 'flex', padding: 0 }}>
              ✕
            </button>
          )}
        </div>

        {/* ── Search dropdown ── */}
        {showSearch && (
          <div style={{
            position: 'absolute', top: '100%', left: 16, right: 16,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: 200, maxHeight: 420, overflowY: 'auto',
          }}>
            {cleanQ.trim().length === 0 ? (
              <div style={{ padding: '20px 16px', color: 'var(--text2)', fontSize: 14, textAlign: 'center' }}>
                {isHashtag ? 'Введите хэштег для поиска' : 'Введите имя пользователя или #хэштег'}
              </div>
            ) : isHashtag ? (
              tagResults.length === 0 ? (
                <div style={{ padding: '20px 16px', color: 'var(--text2)', fontSize: 14, textAlign: 'center' }}>Хэштеги не найдены</div>
              ) : (
                tagResults.map(t => (
                  <button key={t.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '12px 16px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text)', textAlign: 'left',
                      borderBottom: '1px solid var(--border)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Hash size={22} color="var(--text2)" />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>#{t.name}</p>
                      <p style={{ color: 'var(--text2)', fontSize: 13 }}>{t.count.toLocaleString('ru')} публикаций</p>
                    </div>
                  </button>
                ))
              )
            ) : (
              userResults.length === 0 ? (
                <div style={{ padding: '20px 16px', color: 'var(--text2)', fontSize: 14, textAlign: 'center' }}>Пользователи не найдены</div>
              ) : (
                userResults.map(u => (
                  <button key={u.id}
                    onClick={() => { navigate(`/profile/${u.username}`); setQuery(''); setFocused(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '12px 16px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text)', textAlign: 'left',
                      borderBottom: '1px solid var(--border)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
                      {u.photo
                        ? <img src={mediaUrl(u.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--text2)', fontSize: 18 }}>{u.username[0].toUpperCase()}</div>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.username}</p>
                      {u.full_name && <p style={{ color: 'var(--text2)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name}</p>}
                    </div>
                  </button>
                ))
              )
            )}
          </div>
        )}
      </div>

      {/* ── Photo grid ── */}
      {!showSearch && (
        <>
          {isLoading ? (
            <ExploreGrid posts={[]} loading />
          ) : (
            <ExploreGrid posts={posts} onPostClick={(_, i) => setActiveIdx(i)} />
          )}

          {activeIdx !== null && (
            <ReelsViewer
              posts={posts}
              startIndex={activeIdx}
              onClose={() => setActiveIdx(null)}
            />
          )}
        </>
      )}

      {activeIdx === null && <MessagesPill />}
    </div>
  )
}

/* ─── Grid ─── */
function ExploreGrid({
  posts, loading, onPostClick,
}: {
  posts: Post[]
  loading?: boolean
  onPostClick?: (post: Post, index: number) => void
}) {
  const items = loading ? Array.from({ length: 18 }) : posts

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
      {items.map((item, i) => {
        const isLarge = i % 6 === 4

        if (loading) {
          return (
            <div key={i} className="skeleton" style={{
              paddingBottom: '100%',
              gridColumn: isLarge ? 'span 2' : 'span 1',
              gridRow: isLarge ? 'span 2' : 'span 1',
            }} />
          )
        }

        const post = item as Post
        return (
          <GridCell key={post.id} post={post} isLarge={isLarge} onClick={() => onPostClick?.(post, i)} />
        )
      })}
    </div>
  )
}

function GridCell({ post, isLarge, onClick }: { post: Post; isLarge: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  const media = post.medias[0]

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', paddingBottom: '100%', overflow: 'hidden',
        cursor: 'pointer', background: 'var(--bg3)',
        gridColumn: isLarge ? 'span 2' : 'span 1',
        gridRow: isLarge ? 'span 2' : 'span 1',
      }}
    >
      {media && (
        media.type === 'video' ? (
          <video src={mediaUrl(media.url)} muted
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <img src={mediaUrl(media.url)} loading="lazy" alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )
      )}

      {post.medias.length > 1 && (
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <svg viewBox="0 0 18 18" fill="#fff" width="16" height="16">
            <path d="M6.5 5H2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4.5"/>
            <rect x="5" y="1" width="12" height="12" rx="1" fill="none" stroke="#fff" strokeWidth="1.5"/>
          </svg>
        </div>
      )}

      {media?.type === 'video' && post.medias.length === 1 && (
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <svg viewBox="0 0 24 24" fill="#fff" width="18" height="18">
            <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
          </svg>
        </div>
      )}

      {hovered && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28,
          color: '#fff', fontWeight: 700, fontSize: isLarge ? 20 : 16,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Heart size={isLarge ? 22 : 18} fill="#fff" stroke="none" /> {post.likes_count}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageCircle size={isLarge ? 22 : 18} fill="#fff" stroke="none" /> {post.comments_count}
          </span>
        </div>
      )}
    </div>
  )
}
