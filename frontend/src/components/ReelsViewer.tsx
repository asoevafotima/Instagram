import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, VolumeX, Volume2, X, ChevronUp, ChevronDown, Repeat2 } from 'lucide-react'
import { likesApi, savedApi, commentsApi, followsApi, blocksApi, chatsApi, storiesApi, mediaUrl, formatTime } from '../api'
import { useAuth } from '../store/auth'
import type { Post, Comment, Chat } from '../types'
import MessagesPill from './MessagesPill'

interface Props {
  posts: Post[]
  startIndex?: number
  onClose?: () => void
}

export default function ReelsViewer({ posts, startIndex = 0, onClose }: Props) {
  const [idx, setIdx] = useState(startIndex)
  const [showComments, setShowComments] = useState(false)
  const isOverlay = !!onClose
  const post = posts[idx]

  useEffect(() => { setShowComments(false) }, [idx])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') setIdx(i => Math.min(i + 1, posts.length - 1))
      if (e.key === 'ArrowUp')   setIdx(i => Math.max(i - 1, 0))
      if (e.key === 'Escape' && onClose) onClose()
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      if (e.deltaY > 0) setIdx(i => Math.min(i + 1, posts.length - 1))
      else setIdx(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('wheel', onWheel)
    }
  }, [posts.length, onClose])

  if (!post) return null

  const wrap: React.CSSProperties = isOverlay
    ? {
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }
    : {
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2vh 0',
      }

  return (
    <div style={wrap} onClick={e => isOverlay && e.target === e.currentTarget && onClose?.()}>
      {isOverlay && (
        <button onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 20, color: '#fff', display: 'flex', padding: 4, zIndex: 10 }}>
          <X size={28} />
        </button>
      )}

      {/* ── Main row: [left meta] [card] [right actions] ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28 }}>

        {/* Left: username + subscribe + caption */}
        <PostMeta post={post} />

        {/* Center: video card */}
        <PostCard post={post} />

        {/* Right: action buttons */}
        <RightActions post={post} onOpenComments={() => setShowComments(true)} />
      </div>

      {/* ── Up / Down arrows — fixed to right edge ── */}
      <div style={{
        position: 'fixed', right: 28, top: '50%', transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', gap: 10, zIndex: 20,
      }}>
        <button
          onClick={() => setIdx(i => Math.max(i - 1, 0))}
          disabled={idx === 0}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', cursor: idx === 0 ? 'default' : 'pointer',
            opacity: idx === 0 ? 0.25 : 1, transition: 'opacity 0.15s',
          }}
        >
          <ChevronUp size={22} />
        </button>
        <button
          onClick={() => setIdx(i => Math.min(i + 1, posts.length - 1))}
          disabled={idx >= posts.length - 1}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', cursor: idx >= posts.length - 1 ? 'default' : 'pointer',
            opacity: idx >= posts.length - 1 ? 0.25 : 1, transition: 'opacity 0.15s',
          }}
        >
          <ChevronDown size={22} />
        </button>
      </div>

      {/* ── Messages pill — fixed bottom-right ── */}
      <MessagesPill />

      {showComments && <CommentsPanel post={post} onClose={() => setShowComments(false)} />}
    </div>
  )
}


/* ── Portrait card — clean media, no text overlay ── */
function PostCard({ post }: { post: Post }) {
  const [muted, setMuted] = useState(true)
  const [mediaIdx, setMediaIdx] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const media = post.medias[mediaIdx]

  useEffect(() => { setMediaIdx(0) }, [post.id])
  useEffect(() => { if (videoRef.current) videoRef.current.muted = muted }, [muted])

  return (
    <div style={{
      position: 'relative',
      width: 'min(520px, calc(88vh * 10 / 16))',
      height: '88vh',
      borderRadius: 14,
      overflow: 'hidden',
      background: '#111',
      flexShrink: 0,
    }}>
      {/* Media */}
      {media?.type === 'video' ? (
        <video
          ref={videoRef}
          key={media.url}
          src={mediaUrl(media.url)}
          autoPlay loop muted={muted} playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : media ? (
        <>
          {/* Blurred background to fill empty space */}
          <img
            src={mediaUrl(media.url)} alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(18px)', transform: 'scale(1.1)', opacity: 0.75 }}
          />
          {/* Full image on top */}
          <img
            src={mediaUrl(media.url)} alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </>
      ) : null}

      {/* Carousel dots */}
      {post.medias.length > 1 && (
        <div style={{ position: 'absolute', top: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4, zIndex: 3 }}>
          {post.medias.map((_, i) => (
            <div key={i} onClick={() => setMediaIdx(i)}
              style={{ width: 6, height: 6, borderRadius: '50%', cursor: 'pointer', background: i === mediaIdx ? '#fff' : 'rgba(255,255,255,0.4)' }} />
          ))}
        </div>
      )}

      {/* Carousel prev */}
      {post.medias.length > 1 && mediaIdx > 0 && (
        <button onClick={() => setMediaIdx(i => i - 1)}
          style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: 28, height: 28, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 3, fontSize: 16 }}>
          ‹
        </button>
      )}
      {/* Carousel next */}
      {post.medias.length > 1 && mediaIdx < post.medias.length - 1 && (
        <button onClick={() => setMediaIdx(i => i + 1)}
          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: 28, height: 28, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 3, fontSize: 16 }}>
          ›
        </button>
      )}

      {/* Mute button — bottom-right corner */}
      {media?.type === 'video' && (
        <button onClick={() => setMuted(m => !m)}
          style={{
            position: 'absolute', bottom: 12, right: 12,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', border: 'none', cursor: 'pointer', zIndex: 4,
          }}>
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      )}
    </div>
  )
}

/* ── Left panel: username + subscribe + caption (to the LEFT of the card) ── */
function PostMeta({ post }: { post: Post }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user: me } = useAuth()
  const isOwn = me?.id === post.user.id
  const [optimisticFollow, setOptimisticFollow] = useState<boolean | null>(null)
  const [expanded, setExpanded] = useState(false)
  const caption = post.caption ?? ''
  const SHORT = 120

  useEffect(() => { setExpanded(false); setOptimisticFollow(null) }, [post.id])

  const { data: followStatus } = useQuery({
    queryKey: ['follow-status', post.user.id],
    queryFn: async () => {
      const { data } = await followsApi.getStatus(post.user.id)
      return data as { status: string }
    },
    enabled: !isOwn,
    staleTime: 10_000,
  })

  const isFollowed = optimisticFollow !== null
    ? optimisticFollow
    : followStatus?.status === 'accepted'

  function handleFollow() {
    const was = isFollowed
    setOptimisticFollow(!was)
    const call = was ? followsApi.unfollow : followsApi.follow
    call(post.user.id)
      .then(() => qc.invalidateQueries({ queryKey: ['follow-status', post.user.id] }))
      .catch(() => setOptimisticFollow(was))
  }

  return (
    <div style={{ width: 220, flexShrink: 0 }}>
      {/* Avatar + username row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div
          onClick={() => navigate(`/profile/${post.user.username}`)}
          style={{ width: 42, height: 42, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)', cursor: 'pointer', border: '2px solid var(--border)' }}
        >
          {post.user.photo
            ? <img src={mediaUrl(post.user.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{post.user.username[0].toUpperCase()}</div>
          }
        </div>
        <div>
          <span
            onClick={() => navigate(`/profile/${post.user.username}`)}
            style={{ fontWeight: 700, fontSize: 15, cursor: 'pointer', color: 'var(--text)', display: 'block' }}
          >
            {post.user.username}
          </span>
          {!isOwn && (
            <button
              onClick={handleFollow}
              style={{
                color: isFollowed ? 'var(--text2)' : '#0095f6',
                fontWeight: 700, fontSize: 14,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2,
              }}
            >
              {isFollowed ? 'Вы подписаны' : 'Подписаться'}
            </button>
          )}
        </div>
      </div>

      {/* Caption */}
      {caption && (
        <p style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.5 }}>
          {expanded || caption.length <= SHORT
            ? caption
            : caption.slice(0, SHORT) + '…'}
          {caption.length > SHORT && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{ color: 'var(--text2)', fontSize: 14, marginLeft: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {expanded ? 'скрыть' : 'ещё'}
            </button>
          )}
        </p>
      )}
    </div>
  )
}

/* ── Right-side action column ── */
function RightActions({ post, onOpenComments }: {
  post: Post
  onOpenComments: () => void
}) {
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const isOwn = me?.id === post.user.id
  const [liked, setLiked] = useState(post.is_liked)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [saved, setSaved] = useState(post.is_saved)
  const [showMore, setShowMore] = useState(false)
  const [showSend, setShowSend] = useState(false)
  const [reposted, setReposted] = useState(false)
  const [repostMsg, setRepostMsg] = useState('')
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    setLiked(post.is_liked)
    setLikesCount(post.likes_count)
    setSaved(post.is_saved)
    setShowMore(false)
    setShowSend(false)
    setReposted(false)
    setRepostMsg('')
    setBlocked(false)
  }, [post.id])

  async function handleRepost() {
    if (reposted) return
    const media = post.medias[0]
    if (!media) return
    try {
      await storiesApi.create({ url: media.url, type: media.type })
      setReposted(true)
      setRepostMsg(isOwn ? 'Репост добавлен в историю!' : `Репост от @${post.user.username} добавлен в историю!`)
      setTimeout(() => setRepostMsg(''), 2500)
    } catch {
      setRepostMsg('Ошибка!')
      setTimeout(() => setRepostMsg(''), 2000)
    }
  }

  function handleLike() {
    const was = liked; setLiked(!was); setLikesCount(c => was ? c - 1 : c + 1)
    const call = was ? likesApi.unlike : likesApi.like
    call(post.id).catch(() => { setLiked(was); setLikesCount(c => was ? c + 1 : c - 1) })
  }

  function handleSave() {
    const was = saved; setSaved(!was)
    const call = was ? savedApi.unsave : savedApi.save
    call(post.id).catch(() => setSaved(was))
  }

  const Btn = ({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label?: string | number }) => (
    <button
      onClick={onClick}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', minWidth: 52 }}
    >
      {icon}
      {label !== undefined && label !== '' && (
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{label}</span>
      )}
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, paddingBottom: 8 }}>
      <Btn
        onClick={handleLike}
        icon={<Heart size={34} strokeWidth={1.5} fill={liked ? '#ed4956' : 'none'} stroke={liked ? '#ed4956' : 'var(--text)'} />}
        label={likesCount}
      />
      <Btn
        onClick={onOpenComments}
        icon={<MessageCircle size={34} strokeWidth={1.5} />}
        label={post.comments_count}
      />
      {/* Repost — adds to story */}
      <div style={{ position: 'relative' }}>
        <Btn
          onClick={handleRepost}
          icon={<Repeat2 size={32} strokeWidth={1.5} stroke={reposted ? '#0095f6' : 'var(--text)'} />}
        />
        {repostMsg && (
          <div style={{
            position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 14px', whiteSpace: 'nowrap',
            fontSize: 13, color: 'var(--text)', boxShadow: '0 2px 12px rgba(0,0,0,0.5)', zIndex: 10,
          }}>
            {repostMsg}
          </div>
        )}
      </div>

      {/* Send — open chat picker */}
      <div style={{ position: 'relative' }}>
        <Btn
          onClick={() => setShowSend(s => !s)}
          icon={<Send size={32} strokeWidth={1.5} />}
        />
        {showSend && <SendPanel post={post} onClose={() => setShowSend(false)} />}
      </div>
      <Btn
        onClick={handleSave}
        icon={<Bookmark size={32} strokeWidth={1.5} fill={saved ? '#f5a623' : 'none'} stroke={saved ? '#f5a623' : 'var(--text)'} />}
      />
      <div style={{ position: 'relative' }}>
        <Btn
          onClick={() => setShowMore(m => !m)}
          icon={<MoreHorizontal size={32} strokeWidth={1.5} />}
        />
        {showMore && (
          <div
            style={{
              position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 12, overflow: 'hidden', width: 220,
              boxShadow: '0 4px 24px rgba(0,0,0,0.6)', zIndex: 10,
            }}
          >
            {(isOwn ? [
              { label: 'Скопировать ссылку', action: () => { navigator.clipboard.writeText(window.location.href); setShowMore(false) } },
            ] : [
              { label: 'Скопировать ссылку', action: () => { navigator.clipboard.writeText(window.location.href); setShowMore(false) } },
              { label: 'Не интересно', action: () => setShowMore(false) },
              {
                label: blocked ? 'Разблокировать' : 'Заблокировать',
                action: async () => {
                  if (blocked) {
                    await blocksApi.unblock(post.user.id).catch(() => {})
                    setBlocked(false)
                  } else {
                    await blocksApi.block(post.user.id).catch(() => {})
                    setBlocked(true)
                  }
                  setShowMore(false)
                },
                red: !blocked,
              },
              { label: 'Пожаловаться', action: () => setShowMore(false), red: true },
            ]).map(item => (
              <button
                key={item.label}
                onClick={item.action}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '13px 16px', fontSize: 14,
                  color: item.red ? '#ed4956' : 'var(--text)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderTop: '1px solid var(--border)',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Author avatar */}
      <div
        onClick={() => navigate(`/profile/${post.user.username}`)}
        style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)', border: '2px solid var(--border)', cursor: 'pointer', marginTop: 6 }}
      >
        {post.user.photo
          ? <img src={mediaUrl(post.user.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{post.user.username[0].toUpperCase()}</div>
        }
      </div>
    </div>
  )
}

/* ── Send-to-chat popup ── */
function SendPanel({ post, onClose }: { post: Post; onClose: () => void }) {
  const [sending, setSending] = useState<number | null>(null)
  const [sent, setSent] = useState<number | null>(null)

  const { data: chats = [] } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const { data } = await chatsApi.getAll()
      return data as Chat[]
    },
  })

  async function sendToChat(chatId: number) {
    if (sending !== null) return
    setSending(chatId)
    try {
      const postPayload = JSON.stringify({
        id: post.id,
        username: post.user.username,
        media: post.medias[0]?.url,
        mediaType: post.medias[0]?.type,
        caption: post.caption?.slice(0, 120) ?? '',
      })
      await chatsApi.sendMessage(chatId, `__POST__:${postPayload}`)
      setSent(chatId)
      setTimeout(onClose, 1200)
    } catch {
      setSending(null)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: 16, width: 340, maxHeight: '60vh',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Отправить в чат</span>
          <button onClick={onClose} style={{ color: 'var(--text)', display: 'flex' }}><X size={20} /></button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }} className="no-scroll">
          {chats.length === 0 && (
            <p style={{ padding: 24, color: 'var(--text2)', textAlign: 'center', fontSize: 14 }}>Нет чатов</p>
          )}
          {chats.map(c => {
            const name = c.is_group ? (c.name ?? 'Группа') : (c.companion?.username ?? '?')
            const photo = c.is_group ? c.photo : c.companion?.photo
            const isSent = sent === c.id
            return (
              <button
                key={c.id}
                onClick={() => sendToChat(c.id)}
                disabled={sending !== null}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '12px 18px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderTop: '1px solid var(--border)', color: 'var(--text)',
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg)' }}>
                  {photo
                    ? <img src={mediaUrl(photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: 'var(--text2)' }}>{name[0].toUpperCase()}</div>
                  }
                </div>
                <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 600 }}>{name}</span>
                {isSent
                  ? <span style={{ color: '#0095f6', fontSize: 13, fontWeight: 700 }}>Отправлено</span>
                  : sending === c.id
                    ? <span style={{ color: 'var(--text2)', fontSize: 13 }}>...</span>
                    : <span style={{ color: '#0095f6', fontSize: 13, fontWeight: 600 }}>Отправить</span>
                }
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Comments right-side drawer ── */
function CommentsPanel({ post, onClose }: { post: Post; onClose: () => void }) {
  const { user: me } = useAuth()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<{ id: number; username: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: comments = [], refetch } = useQuery({
    queryKey: ['comments', post.id],
    queryFn: async () => {
      const { data } = await commentsApi.getAll(post.id)
      return data as Comment[]
    },
  })

  function handleReply(commentId: number, username: string) {
    setReplyTo({ id: commentId, username })
    setText('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function cancelReply() {
    setReplyTo(null)
    setText('')
  }

  async function send() {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await commentsApi.create(post.id, text.trim(), replyTo?.id ?? null)
      setText('')
      setReplyTo(null)
      refetch()
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 700, display: 'flex' }}>
      <div onClick={onClose} style={{ flex: 1 }} />
      <div style={{
        width: 400, height: '100vh',
        background: 'var(--bg2)',
        borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 17 }}>Комментарии</span>
          <button onClick={onClose} style={{ color: 'var(--text)', display: 'flex', padding: 4 }}><X size={22} /></button>
        </div>

        {/* Comments list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px' }} className="no-scroll">
          {comments.length === 0 && (
            <p style={{ color: 'var(--text2)', textAlign: 'center', padding: 32, fontSize: 15 }}>Нет комментариев</p>
          )}
          {comments.map(c => (
            <CommentItem
              key={c.id}
              comment={c}
              me={me}
              onReply={handleReply}
              onDelete={() => commentsApi.delete(c.id).then(() => refetch())}
            />
          ))}
        </div>

        {/* Reply banner */}
        {replyTo && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 16px', background: 'var(--bg3)',
            borderTop: '1px solid var(--border)', flexShrink: 0,
          }}>
            <span style={{ color: 'var(--text2)', fontSize: 13 }}>Ответ для @{replyTo.username}</span>
            <button onClick={cancelReply} style={{ color: 'var(--text2)', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={replyTo ? `Ответить @${replyTo.username}...` : 'Добавьте комментарий...'}
            onKeyDown={e => e.key === 'Enter' && send()}
            style={{
              flex: 1, background: 'var(--input-bg)', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 14, fontFamily: 'inherit',
              borderRadius: 22, padding: '10px 16px',
            }}
            autoFocus
          />
          {text.trim() && (
            <button onClick={send} disabled={sending} style={{ color: '#0095f6', fontWeight: 700, fontSize: 14, opacity: sending ? 0.6 : 1, flexShrink: 0 }}>
              Опубл.
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Single comment row (used for both top-level and replies) ── */
function CommentItem({
  comment, me, onReply, onDelete, isReply = false,
}: {
  comment: Comment
  me: { id: number } | null
  onReply: (id: number, username: string) => void
  onDelete: () => void
  isReply?: boolean
}) {
  const [liked, setLiked] = useState(comment.is_liked)
  const [likesCount, setLikesCount] = useState(comment.likes_count)
  const [showReplies, setShowReplies] = useState(false)
  const [replies, setReplies] = useState<Comment[]>([])
  const [loadingReplies, setLoadingReplies] = useState(false)
  const repliesCount = comment.replies_count

  function handleLike() {
    const was = liked
    setLiked(!was)
    setLikesCount(c => was ? c - 1 : c + 1)
    const call = was ? commentsApi.unlikeComment : commentsApi.likeComment
    call(comment.id).catch(() => {
      setLiked(was)
      setLikesCount(c => was ? c + 1 : c - 1)
    })
  }

  async function toggleReplies() {
    if (showReplies) { setShowReplies(false); return }
    if (loadingReplies) return
    setLoadingReplies(true)
    try {
      const { data } = await commentsApi.getReplies(comment.id)
      setReplies(data as Comment[])
      setShowReplies(true)
    } finally {
      setLoadingReplies(false)
    }
  }

  const avatarSize = isReply ? 30 : 38

  return (
    <div style={{ marginBottom: isReply ? 10 : 18 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {/* Avatar */}
        <div style={{ width: avatarSize, height: avatarSize, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
          {comment.user.photo
            ? <img src={mediaUrl(comment.user.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--text2)', fontSize: isReply ? 11 : 13 }}>{comment.user.username[0].toUpperCase()}</div>
          }
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0 }}>
            <span style={{ fontWeight: 700, marginRight: 6 }}>{comment.user.username}</span>
            <span style={{ color: 'var(--text)' }}>{comment.text}</span>
          </p>
          <div style={{ display: 'flex', gap: 14, marginTop: 5, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text2)', fontSize: 12 }}>{formatTime(comment.created_at)}</span>
            {likesCount > 0 && (
              <span style={{ color: 'var(--text2)', fontSize: 12 }}>{likesCount} нрав.</span>
            )}
            {!isReply && (
              <button
                onClick={() => onReply(comment.id, comment.user.username)}
                style={{ color: 'var(--text2)', fontSize: 12, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Ответить
              </button>
            )}
            {me?.id === comment.user.id && (
              <button
                onClick={onDelete}
                style={{ color: 'var(--text2)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Удалить
              </button>
            )}
          </div>
        </div>

        {/* Like button */}
        <button
          onClick={handleLike}
          style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0 0 4px', display: 'flex' }}
        >
          <Heart
            size={14} strokeWidth={1.5}
            fill={liked ? '#ed4956' : 'none'}
            stroke={liked ? '#ed4956' : 'var(--text2)'}
          />
        </button>
      </div>

      {/* Replies toggle */}
      {!isReply && repliesCount > 0 && (
        <div style={{ marginLeft: avatarSize + 10, marginTop: 6 }}>
          <button
            onClick={toggleReplies}
            style={{ color: 'var(--text2)', fontSize: 12, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ display: 'inline-block', width: 24, height: 1, background: 'var(--text2)', verticalAlign: 'middle' }} />
            {loadingReplies ? 'Загрузка...' : showReplies ? 'Скрыть ответы' : `Ответы (${repliesCount})`}
          </button>
        </div>
      )}

      {/* Replies list */}
      {showReplies && replies.length > 0 && (
        <div style={{ marginLeft: avatarSize + 10, marginTop: 8 }}>
          {replies.map(r => (
            <CommentItem
              key={r.id}
              comment={r}
              me={me}
              onReply={onReply}
              onDelete={() => {
                commentsApi.delete(r.id).then(() =>
                  setReplies(prev => prev.filter(x => x.id !== r.id))
                )
              }}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  )
}
