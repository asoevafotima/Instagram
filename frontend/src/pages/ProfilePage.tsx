import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Grid3x3, Bookmark, Repeat2, UserSquare2, Plus, X, Trash2, Settings } from 'lucide-react'
import { usersApi, postsApi, followsApi, chatsApi, savedApi, storiesApi, highlightsApi, mediaUrl, uploadApi } from '../api'
import { useAuth } from '../store/auth'
import type { Post, UserShort, Highlight } from '../types'
import ReelsViewer from '../components/ReelsViewer'
import MessagesPill from '../components/MessagesPill'

type Tab = 'posts' | 'saved' | 'reels' | 'tagged'

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('posts')
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null)
  const [highlightModal, setHighlightModal] = useState(false)
  const [viewHighlight, setViewHighlight] = useState<Highlight | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [viewerSource, setViewerSource] = useState<'posts' | 'saved'>('posts')
  const [showArchive, setShowArchive] = useState(false)

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data } = await usersApi.getByUsername(username!)
      return data as UserShort & { bio?: string; is_private?: boolean }
    },
    enabled: !!username,
  })

  const { data: counts } = useQuery({
    queryKey: ['follow-counts', profile?.id],
    queryFn: async () => {
      const { data } = await followsApi.getCounts(profile!.id)
      return data as { followers: number; following: number }
    },
    enabled: !!profile,
  })

  const { data: followStatus, isLoading: followStatusLoading } = useQuery({
    queryKey: ['follow-status', profile?.id],
    queryFn: async () => {
      const { data } = await followsApi.getStatus(profile!.id)
      return data as { status: 'accepted' | 'pending' | 'none' }
    },
    enabled: !!profile && profile.id !== me?.id,
    staleTime: 30_000,
  })

  const isOwn = me?.id === profile?.id
  const isPrivateLocked = !!profile?.is_private && !isOwn && !followStatusLoading && followStatus?.status !== 'accepted'

  const { data: posts = [] } = useQuery({
    queryKey: ['user-posts', profile?.id],
    queryFn: async () => {
      const { data } = await postsApi.getUserPosts(profile!.id, 0, 30)
      return data as Post[]
    },
    enabled: !!profile && !isPrivateLocked,
  })

  const { data: highlights = [], refetch: refetchHighlights } = useQuery({
    queryKey: ['highlights', profile?.id],
    queryFn: async () => {
      const { data } = await highlightsApi.getUserHighlights(profile!.id)
      return data as Highlight[]
    },
    enabled: !!profile && !isPrivateLocked,
  })

  const { data: savedPosts = [] } = useQuery({
    queryKey: ['saved-posts'],
    queryFn: async () => {
      const { data } = await savedApi.getSaved(0, 30)
      return (data as { post: Post }[]).map(item => item.post)
    },
    enabled: isOwn,
    staleTime: 0,
  })

  const { data: repostStories = [] } = useQuery({
    queryKey: ['user-stories', profile?.id],
    queryFn: async () => {
      const { data } = await storiesApi.getUserStories(profile!.id)
      return data as { id: number; url: string; type: string; created_at: string }[]
    },
    enabled: !!profile && tab === 'reels',
  })

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (followStatus?.status === 'accepted') await followsApi.unfollow(profile!.id)
      else await followsApi.follow(profile!.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['follow-status', profile?.id] })
      qc.invalidateQueries({ queryKey: ['follow-counts', profile?.id] })
      qc.invalidateQueries({ queryKey: ['feed'] })
      qc.invalidateQueries({ queryKey: ['stories-feed'] })
    },
  })

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const url = await uploadApi.upload(file)
      await usersApi.updateMe({ photo: url })
      await refetchProfile()
      qc.invalidateQueries({ queryKey: ['me'] })
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handleMessage() {
    if (!profile) return
    const { data: chat } = await chatsApi.create([profile.id], false)
    navigate('/messages', { state: { chatId: chat.id } })
  }

  if (!profile) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )

  const isFollowing = followStatus?.status === 'accepted'
  const isPending = followStatus?.status === 'pending'

  const btnBase: React.CSSProperties = {
    flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px 12px',
    fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--text)',
    textAlign: 'center' as const,
  }

  return (
    <div style={{ maxWidth: 935, margin: '0 auto', padding: '30px 20px 80px' }}>

      {/* ── Header: avatar + info ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 80, marginBottom: 22 }}>

        {/* Avatar */}
        <div style={{ flexShrink: 0 }}>
          <div
            onClick={() => isOwn && avatarInputRef.current?.click()}
            style={{
              width: 168, height: 168, borderRadius: '50%',
              overflow: 'hidden', background: 'var(--bg3)',
              cursor: isOwn ? 'pointer' : 'default',
              border: '1px solid var(--border)',
              opacity: avatarUploading ? 0.6 : 1,
            }}
          >
            {profile.photo
              ? <img src={mediaUrl(profile.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, fontWeight: 700, color: 'var(--text2)' }}>{profile.username[0].toUpperCase()}</div>
            }
          </div>
          {isOwn && (
            <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          )}
        </div>

        {/* Info column */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 8 }}>

          {/* Username row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 20, fontWeight: 300, letterSpacing: 0 }}>{profile.username}</h2>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 36, marginBottom: 16 }}>
            <span style={{ fontSize: 16 }}>
              <strong style={{ fontWeight: 600 }}>{posts.length}</strong>
              <span style={{ marginLeft: 5 }}>публикаций</span>
            </span>
            <span
              style={{ fontSize: 16, cursor: isPrivateLocked ? 'default' : 'pointer', opacity: isPrivateLocked ? 0.5 : 1 }}
              onClick={() => !isPrivateLocked && setFollowModal('followers')}
            >
              <strong style={{ fontWeight: 600 }}>{counts?.followers ?? 0}</strong>
              <span style={{ marginLeft: 5 }}>подписчиков</span>
            </span>
            <span
              style={{ fontSize: 16, cursor: isPrivateLocked ? 'default' : 'pointer', opacity: isPrivateLocked ? 0.5 : 1 }}
              onClick={() => !isPrivateLocked && setFollowModal('following')}
            >
              <strong style={{ fontWeight: 600 }}>{counts?.following ?? 0}</strong>
              <span style={{ marginLeft: 5 }}>подписок</span>
            </span>
          </div>

          {/* Name + bio */}
          {profile.full_name && (
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{profile.full_name}</p>
          )}
          {(profile as any).bio && (
            <p style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{(profile as any).bio}</p>
          )}
        </div>
      </div>

      {/* ── Action buttons row (below header) ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {isOwn ? (
          <>
            <button onClick={() => navigate('/profile/edit')} style={btnBase}>
              Редактировать профиль
            </button>
            <button onClick={() => setShowArchive(true)} style={btnBase}>
              Посмотреть архив
            </button>
            <button onClick={() => navigate('/settings')} style={{ ...btnBase, flex: 'none', padding: '8px 12px' }}>
              <Settings size={18} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => !followStatusLoading && toggleFollow.mutate()}
              disabled={toggleFollow.isPending || followStatusLoading}
              style={{
                ...btnBase,
                background: followStatusLoading ? 'var(--bg3)' : isFollowing ? 'var(--bg3)' : '#0095f6',
                color: followStatusLoading ? 'var(--text2)' : isFollowing ? 'var(--text)' : '#fff',
                border: (followStatusLoading || isFollowing) ? '1px solid var(--border)' : 'none',
                opacity: (toggleFollow.isPending || followStatusLoading) ? 0.7 : 1,
              }}
            >
              {followStatusLoading ? '...' : isFollowing ? 'Отписаться' : isPending ? 'Запрос отправлен' : 'Подписаться'}
            </button>
            {!isPrivateLocked && (
              <button onClick={handleMessage} style={btnBase}>
                Сообщение
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Story highlights ── */}
      {!isPrivateLocked && (isOwn || highlights.length > 0) && (
        <div style={{ display: 'flex', gap: 24, marginBottom: 28, paddingBottom: 4, overflowX: 'auto' }} className="no-scroll">
          {isOwn && (
            <div
              onClick={() => setHighlightModal(true)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}
            >
              <div style={{
                width: 77, height: 77, borderRadius: '50%',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg2)',
              }}>
                <Plus size={28} strokeWidth={1.2} color="var(--text2)" />
              </div>
              <span style={{ fontSize: 12, color: 'var(--text)' }}>Добавить</span>
            </div>
          )}
          {highlights.map(h => (
            <div
              key={h.id}
              onClick={() => setViewHighlight(h)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}
            >
              <div style={{
                width: 77, height: 77, borderRadius: '50%', overflow: 'hidden',
                border: '2px solid var(--border)', background: 'var(--bg3)',
              }}>
                {h.cover
                  ? <img src={mediaUrl(h.cover)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : h.stories[0]?.url
                    ? <img src={mediaUrl(h.stories[0].url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
                        <Bookmark size={28} strokeWidth={1.2} />
                      </div>
                }
              </div>
              <span style={{ fontSize: 12, color: 'var(--text)', maxWidth: 77, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                {h.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Private lock state ── */}
      {isPrivateLocked ? (
        <div style={{ borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0 32px', color: 'var(--text2)' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            border: '2px solid var(--text2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Закрытый аккаунт</p>
          <p style={{ fontSize: 14, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
            {isPending
              ? 'Ваш запрос на подписку отправлен. Дождитесь одобрения.'
              : 'Подпишитесь на этот аккаунт, чтобы видеть фото и видео.'}
          </p>
        </div>
      ) : (
      /* ── Tabs ── */
      <div style={{ borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', gap: 56 }}>
        {([
          { id: 'posts', icon: Grid3x3, label: 'Публикации' },
          { id: 'saved', icon: Bookmark, label: 'Сохранённое' },
          { id: 'reels', icon: Repeat2, label: 'Репосты' },
          { id: 'tagged', icon: UserSquare2, label: 'Отметки' },
        ] as { id: Tab; icon: any; label: string }[]).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            title={label}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '12px 4px',
              borderTop: tab === id ? '1px solid var(--text)' : '1px solid transparent',
              marginTop: -1,
              display: 'flex', alignItems: 'center', gap: 6,
              color: tab === id ? 'var(--text)' : 'var(--text2)',
              fontSize: 12, fontWeight: 500, letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            <Icon size={14} strokeWidth={2} />
            <span className="nav-label" style={{ display: 'inline' }}>{label}</span>
          </button>
        ))}
      </div>
      )}

      {/* ── Posts grid ── */}
      {!isPrivateLocked && tab === 'posts' && (
        posts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', color: 'var(--text2)' }}>
            <div style={{
              width: 62, height: 62, borderRadius: '50%',
              border: '2px solid var(--text2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" width="30" height="30">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Поделитесь фото</p>
            <p style={{ fontSize: 14, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
              Фото, которыми вы делитесь, будут показываться в вашем профиле.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, marginTop: 3 }}>
            {posts.map((post, i) => (
              <PostThumbnail key={post.id} post={post} onClick={() => { setViewerSource('posts'); setActiveIdx(i) }} />
            ))}
          </div>
        )
      )}

      {/* ── Saved posts ── */}
      {!isPrivateLocked && tab === 'saved' && isOwn && (
        savedPosts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', color: 'var(--text2)' }}>
            <Bookmark size={48} strokeWidth={1} style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Сохраните фото и видео</p>
            <p style={{ fontSize: 14, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
              Сохраняйте фото и видео, которые хотите посмотреть снова.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, marginTop: 3 }}>
            {savedPosts.map((post, i) => (
              <PostThumbnail key={post.id} post={post} onClick={() => { setViewerSource('saved'); setActiveIdx(i) }} />
            ))}
          </div>
        )
      )}

      {/* ── Репосты (stories) ── */}
      {!isPrivateLocked && tab === 'reels' && (
        repostStories.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', color: 'var(--text2)' }}>
            <Repeat2 size={48} strokeWidth={1} style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Нет репостов</p>
            <p style={{ fontSize: 14, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
              Репосты в истории будут отображаться здесь.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, marginTop: 3 }}>
            {repostStories.map(s => (
              <div key={s.id} style={{ position: 'relative', paddingBottom: '100%', background: 'var(--bg3)', overflow: 'hidden' }}>
                {s.type === 'video'
                  ? <video src={mediaUrl(s.url)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <img src={mediaUrl(s.url)} loading="lazy" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                }
              </div>
            ))}
          </div>
        )
      )}

      {!isPrivateLocked && tab === 'tagged' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', color: 'var(--text2)' }}>
          <p style={{ fontSize: 16 }}>Нет публикаций</p>
        </div>
      )}

      {/* ── Followers / Following modal ── */}
      {followModal && (
        <FollowListModal
          userId={profile.id}
          type={followModal}
          onClose={() => setFollowModal(null)}
          onUserClick={(u) => { setFollowModal(null); navigate(`/profile/${u.username}`) }}
        />
      )}

      {/* ── Create highlight modal ── */}
      {highlightModal && (
        <CreateHighlightModal
          onClose={() => setHighlightModal(false)}
          onCreated={() => { setHighlightModal(false); refetchHighlights() }}
        />
      )}

      {/* ── View highlight modal ── */}
      {viewHighlight && (
        <ViewHighlightModal
          highlight={viewHighlight}
          isOwn={isOwn}
          onClose={() => setViewHighlight(null)}
          onDeleted={() => { setViewHighlight(null); refetchHighlights() }}
        />
      )}

      <MessagesPill />

      {/* ── Post viewer ── */}
      {activeIdx !== null && (
        <ReelsViewer
          posts={viewerSource === 'saved' ? savedPosts : posts}
          startIndex={activeIdx}
          onClose={() => setActiveIdx(null)}
        />
      )}

      {/* ── Archive modal ── */}
      {showArchive && profile && (
        <ArchiveModal userId={profile.id} onClose={() => setShowArchive(false)} />
      )}
    </div>
  )
}

function CreateHighlightModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user: me } = useAuth()
  const [step, setStep] = useState<'pick' | 'name'>('pick')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: myStories = [] } = useQuery({
    queryKey: ['my-stories', me?.id],
    queryFn: async () => {
      const { data } = await storiesApi.getUserStories(me!.id)
      return data as { id: number; url: string; type: string }[]
    },
    enabled: !!me,
  })

  function toggleStory(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    try {
      const { data: newH } = await highlightsApi.create(name.trim())
      await Promise.all([...selected].map(sid => highlightsApi.addStory(newH.id, sid)))
      onCreated()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        background: 'var(--bg2)', borderRadius: 14,
        width: 400, maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)', gap: 8 }}>
          {step === 'name' && (
            <button onClick={() => setStep('pick')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: 14, fontWeight: 600, padding: '2px 6px' }}>
              ‹
            </button>
          )}
          <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>
            {step === 'pick' ? 'Выбрать истории' : 'Новое актуальное'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex' }}>
            <X size={22} />
          </button>
        </div>

        {step === 'pick' ? (
          <>
            <div style={{ overflowY: 'auto', flex: 1, padding: 12 }}>
              {myStories.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text2)' }}>
                  <p style={{ fontSize: 15, marginBottom: 8 }}>Нет историй</p>
                  <p style={{ fontSize: 13 }}>Сначала опубликуйте историю, затем добавьте её в актуальное</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
                  {myStories.map(s => (
                    <div
                      key={s.id}
                      onClick={() => toggleStory(s.id)}
                      style={{ position: 'relative', paddingBottom: '100%', cursor: 'pointer', background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}
                    >
                      {s.type === 'video' ? (
                        <video src={mediaUrl(s.url)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <img src={mediaUrl(s.url)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                      {selected.has(s.id) && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,149,246,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#0095f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>✓</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setStep('name')}
                style={{
                  width: '100%', background: '#0095f6', color: '#fff',
                  border: 'none', borderRadius: 8, padding: '11px',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}
              >
                Далее
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Cover preview */}
            {selected.size > 0 && myStories.find(s => selected.has(s.id)) && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <div style={{ width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--border)', background: 'var(--bg3)' }}>
                  {(() => {
                    const first = myStories.find(s => selected.has(s.id))!
                    return first.type === 'video'
                      ? <video src={mediaUrl(first.url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <img src={mediaUrl(first.url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  })()}
                </div>
              </div>
            )}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Название</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Название актуального"
                maxLength={20}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '10px 12px',
                  fontSize: 14, color: 'var(--text)', outline: 'none',
                }}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || loading}
              style={{
                background: '#0095f6', color: '#fff',
                border: 'none', borderRadius: 8,
                padding: '11px', fontWeight: 700, fontSize: 14,
                cursor: !name.trim() || loading ? 'default' : 'pointer',
                opacity: !name.trim() || loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ViewHighlightModal({ highlight, isOwn, onClose, onDeleted }: {
  highlight: Highlight
  isOwn: boolean
  onClose: () => void
  onDeleted: () => void
}) {
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const [idx, setIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [showAddPicker, setShowAddPicker] = useState(false)
  const [currentHighlight, setCurrentHighlight] = useState(highlight)
  const stories = currentHighlight.stories
  const current = stories[idx]

  const { data: myStories = [] } = useQuery({
    queryKey: ['my-stories', me?.id],
    queryFn: async () => {
      const { data } = await storiesApi.getUserStories(me!.id)
      return data as { id: number; url: string; type: string }[]
    },
    enabled: isOwn && showAddPicker && !!me,
  })

  const existingIds = new Set(stories.map(s => s.id))
  const availableStories = myStories.filter(s => !existingIds.has(s.id))

  async function handleAddStory(storyId: number) {
    await highlightsApi.addStory(currentHighlight.id, storyId)
    const { data } = await highlightsApi.getUserHighlights(currentHighlight.user.id)
    const updated = (data as Highlight[]).find(h => h.id === currentHighlight.id)
    if (updated) setCurrentHighlight(updated)
    qc.invalidateQueries({ queryKey: ['highlights', currentHighlight.user.id] })
  }

  async function handleRemoveStory(storyId: number) {
    await highlightsApi.removeStory(currentHighlight.id, storyId)
    setCurrentHighlight(prev => ({ ...prev, stories: prev.stories.filter(s => s.id !== storyId) }))
    if (idx >= stories.length - 1) setIdx(Math.max(0, stories.length - 2))
    qc.invalidateQueries({ queryKey: ['highlights', currentHighlight.user.id] })
  }

  async function handleDelete() {
    if (!confirm(`Удалить актуальное «${currentHighlight.name}»?`)) return
    setDeleting(true)
    try {
      await highlightsApi.delete(currentHighlight.id)
      onDeleted()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        background: '#000', borderRadius: 14,
        width: 380, maxHeight: '90vh',
        overflow: 'hidden', position: 'relative',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          padding: '14px 14px 10px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid #fff', flexShrink: 0, background: 'var(--bg3)' }}>
            {highlight.cover
              ? <img src={mediaUrl(highlight.cover)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : stories[0]?.url
                ? <img src={mediaUrl(stories[0].url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : null
            }
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, flex: 1 }}>{currentHighlight.name}</span>
          {isOwn && (
            <>
              <button
                onClick={() => setShowAddPicker(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', padding: 4 }}
                title="Добавить истории"
              >
                <Plus size={20} />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ed4956', display: 'flex', padding: 4 }}
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', padding: 4 }}>
            <X size={22} />
          </button>
        </div>

        {stories.length === 0 ? (
          <div style={{ height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', gap: 12 }}>
            <Bookmark size={48} strokeWidth={1} />
            <p style={{ fontSize: 15 }}>В этом актуальном нет историй</p>
            {isOwn && (
              <button
                onClick={() => setShowAddPicker(true)}
                style={{ color: '#0095f6', fontWeight: 600, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Добавить истории
              </button>
            )}
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {current.type === 'video' ? (
              <video
                src={mediaUrl(current.url)}
                autoPlay
                controls
                style={{ width: '100%', maxHeight: 560, objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <img
                src={mediaUrl(current.url)}
                alt=""
                style={{ width: '100%', maxHeight: 560, objectFit: 'contain', display: 'block' }}
              />
            )}
            {idx > 0 && (
              <button onClick={() => setIdx(i => i - 1)} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 18 }}>‹</button>
            )}
            {idx < stories.length - 1 && (
              <button onClick={() => setIdx(i => i + 1)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 18 }}>›</button>
            )}
            {isOwn && (
              <button
                onClick={() => current && handleRemoveStory(current.id)}
                style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 6, padding: '5px 10px', color: '#ed4956', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
              >
                Удалить из актуального
              </button>
            )}
          </div>
        )}

        {stories.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '8px 0', background: '#000' }}>
            {stories.map((_, i) => (
              <div key={i} onClick={() => setIdx(i)} style={{ width: 6, height: 6, borderRadius: '50%', cursor: 'pointer', background: i === idx ? '#fff' : 'rgba(255,255,255,0.4)' }} />
            ))}
          </div>
        )}

        {/* Add stories picker */}
        {showAddPicker && (
          <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', padding: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 10 }}>
              Добавить из историй
            </p>
            {availableStories.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', padding: '16px 0' }}>
                Нет новых историй для добавления
              </p>
            ) : (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }} className="no-scroll">
                {availableStories.map(s => (
                  <div
                    key={s.id}
                    onClick={() => handleAddStory(s.id)}
                    style={{ flexShrink: 0, width: 72, height: 72, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', position: 'relative', background: 'var(--bg3)' }}
                  >
                    {s.type === 'video'
                      ? <video src={mediaUrl(s.url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <img src={mediaUrl(s.url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    }
                    <div style={{ position: 'absolute', bottom: 4, right: 4, background: '#0095f6', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus size={11} color="#fff" strokeWidth={3} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PostThumbnail({ post, onClick }: { post: Post; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', paddingBottom: '100%', background: 'var(--bg3)', overflow: 'hidden', cursor: 'pointer' }}
    >
      {post.medias[0] && (
        <img
          src={mediaUrl(post.medias[0].url)}
          loading="lazy"
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      {hovered && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
          color: '#fff', fontWeight: 700, fontSize: 16,
        }}>
          <span>❤️ {post.likes_count}</span>
          <span>💬 {post.comments_count}</span>
        </div>
      )}
      {post.medias.length > 1 && (
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <svg viewBox="0 0 18 18" fill="#fff" width="16" height="16">
            <path d="M6.5 5H2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4.5"/>
            <rect x="5" y="1" width="12" height="12" rx="1" fill="none" stroke="#fff" strokeWidth="1.5"/>
          </svg>
        </div>
      )}
    </div>
  )
}

function ArchiveModal({ userId, onClose }: { userId: number; onClose: () => void }) {
  const { data: stories = [] } = useQuery({
    queryKey: ['archive-stories', userId],
    queryFn: async () => {
      const { data } = await storiesApi.getUserStories(userId)
      return data as { id: number; url: string; type: string; created_at: string }[]
    },
  })

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        background: 'var(--bg2)', borderRadius: 14,
        width: 480, maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 700, fontSize: 17 }}>Архив историй</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex' }}>
            <X size={22} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: 12 }}>
          {stories.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text2)', padding: '40px 0', fontSize: 15 }}>
              Нет историй в архиве
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
              {stories.map(s => (
                <div key={s.id} style={{ position: 'relative', paddingBottom: '100%', background: 'var(--bg3)', overflow: 'hidden', borderRadius: 4 }}>
                  {s.type === 'video'
                    ? <video src={mediaUrl(s.url)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <img src={mediaUrl(s.url)} loading="lazy" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  }
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FollowListModal({ userId, type, onClose, onUserClick }: {
  userId: number
  type: 'followers' | 'following'
  onClose: () => void
  onUserClick: (u: UserShort) => void
}) {
  const { data: users = [] } = useQuery({
    queryKey: ['follow-list', userId, type],
    queryFn: async () => {
      const { data } = type === 'followers'
        ? await followsApi.getFollowers(userId, 0, 100)
        : await followsApi.getFollowing(userId, 0, 100)
      return data as UserShort[]
    },
  })

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        background: 'var(--bg2)', borderRadius: 12,
        width: 400, maxHeight: '70vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', border: '1px solid var(--border)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>
            {type === 'followers' ? 'Подписчики' : 'Подписки'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex' }}>
            <X size={22} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {users.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text2)', padding: 32 }}>Нет пользователей</p>
          )}
          {users.map(u => (
            <div
              key={u.id}
              onClick={() => onUserClick(u)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--hover)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
            >
              <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
                {u.photo
                  ? <img src={mediaUrl(u.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--text2)', fontSize: 16 }}>{u.username[0].toUpperCase()}</div>
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
    </div>
  )
}
