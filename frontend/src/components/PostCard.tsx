import { useState, useRef } from 'react'
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ChevronLeft, ChevronRight, Volume2, VolumeX, CornerDownRight } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { likesApi, commentsApi, savedApi, postsApi, mediaUrl, formatTime } from '../api'
import { useAuth } from '../store/auth'
import type { Post, Comment } from '../types'

interface Props {
  post: Post
}

export default function PostCard({ post }: Props) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [liked, setLiked] = useState(post.is_liked)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [saved, setSaved] = useState(post.is_saved)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: number; username: string } | null>(null)
  const [localCommentsCount, setLocalCommentsCount] = useState(post.comments_count)
  const [showMenu, setShowMenu] = useState(false)
  const [captionExpanded, setCaptionExpanded] = useState(false)
  const [heartAnim, setHeartAnim] = useState(false)
  const [mediaIdx, setMediaIdx] = useState(0)
  const [videoMuted, setVideoMuted] = useState(true)
  const commentRef = useRef<HTMLInputElement>(null)
  const lastTap = useRef(0)
  const likeAnimTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['comments', post.id],
    queryFn: async () => {
      const { data } = await commentsApi.getAll(post.id)
      return data as Comment[]
    },
    enabled: showComments,
  })

  function handleLike() {
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikesCount(c => wasLiked ? c - 1 : c + 1)
    const call = wasLiked ? likesApi.unlike : likesApi.like
    call(post.id).catch(() => {
      setLiked(wasLiked)
      setLikesCount(c => wasLiked ? c + 1 : c - 1)
    })
  }

  function handleDoubleTap() {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      if (!liked) {
        handleLike()
        setHeartAnim(true)
        clearTimeout(likeAnimTimerRef.current)
        likeAnimTimerRef.current = setTimeout(() => setHeartAnim(false), 800)
      }
    }
    lastTap.current = now
  }

  function handleSave() {
    const wasSaved = saved
    setSaved(!wasSaved)
    const call = wasSaved ? savedApi.unsave : savedApi.save
    call(post.id).catch(() => setSaved(wasSaved))
  }

  const addComment = useMutation({
    mutationFn: async () => {
      await commentsApi.create(post.id, commentText.trim(), replyTo?.id ?? null)
    },
    onSuccess: () => {
      setCommentText('')
      setReplyTo(null)
      setLocalCommentsCount(c => c + 1)
      setShowComments(true)
      refetchComments()
    },
  })

  const deletePost = useMutation({
    mutationFn: () => postsApi.delete(post.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  })

  const isOwn = user?.id === post.user.id
  const currentMedia = post.medias[mediaIdx]
  const caption = post.caption ?? ''
  const captionShort = caption.length > 125 ? caption.slice(0, 125) : caption
  const captionTruncated = caption.length > 125

  function formatLikes(n: number) {
    if (n === 1) return '1 отметка «Нравится»'
    if (n < 5) return `${n} отметки «Нравится»`
    return `${n.toLocaleString('ru')} отметок «Нравится»`
  }

  return (
    <article style={{ marginBottom: 4, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0 10px', gap: 10 }}>
        <div
          onClick={() => navigate(`/profile/${post.user.username}`)}
          style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)', cursor: 'pointer' }}
        >
          {post.user.photo
            ? <img src={mediaUrl(post.user.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--text2)', fontSize: 13 }}>{post.user.username[0].toUpperCase()}</div>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
            onClick={() => navigate(`/profile/${post.user.username}`)}
          >{post.user.username}</span>
          <span style={{ color: 'var(--text2)', fontSize: 12 }}> • {formatTime(post.created_at)}</span>
        </div>
        {isOwn && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(o => !o)}
              style={{ color: 'var(--text)', display: 'flex', alignItems: 'center', padding: 4 }}
            >
              <MoreHorizontal size={20} />
            </button>
            {showMenu && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 4px)',
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 10, overflow: 'hidden', width: 200,
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)', zIndex: 100,
              }}>
                <button
                  onClick={() => { deletePost.mutate(); setShowMenu(false) }}
                  style={{ display: 'block', width: '100%', padding: '13px 16px', textAlign: 'left', color: '#ed4956', fontWeight: 700, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Удалить
                </button>
                <button
                  onClick={() => setShowMenu(false)}
                  style={{ display: 'block', width: '100%', padding: '13px 16px', textAlign: 'left', color: 'var(--text)', fontSize: 14, borderTop: '1px solid var(--border)', background: 'none', border: 'none', cursor: 'pointer', borderTopColor: 'var(--border)', borderTopStyle: 'solid', borderTopWidth: 1 }}
                >
                  Отмена
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Media */}
      {currentMedia && (
        <div
          className="post-img-wrap"
          style={{ background: '#000', borderRadius: 4, cursor: 'pointer', userSelect: 'none', position: 'relative' }}
          onClick={handleDoubleTap}
        >
          {currentMedia.type === 'video' ? (
            <div style={{ position: 'relative' }}>
              <video
                key={currentMedia.url}
                src={mediaUrl(currentMedia.url)}
                autoPlay
                loop
                playsInline
                muted={videoMuted}
                preload="auto"
                style={{ width: '100%', display: 'block', maxHeight: 585, objectFit: 'contain' }}
                onClick={e => e.stopPropagation()}
              />
              <button
                onClick={e => { e.stopPropagation(); setVideoMuted(m => !m) }}
                style={{
                  position: 'absolute', bottom: 10, right: 10,
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.55)', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                }}
              >
                {videoMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
            </div>
          ) : (
            <img
              src={mediaUrl(currentMedia.url)}
              alt=""
              style={{ width: '100%', display: 'block', maxHeight: 585, objectFit: 'cover' }}
              draggable={false}
            />
          )}

          {heartAnim && (
            <div className="heart-pop" style={{ fontSize: 90 }}>❤️</div>
          )}

          {/* Carousel controls */}
          {post.medias.length > 1 && (
            <>
              {mediaIdx > 0 && (
                <button
                  onClick={e => { e.stopPropagation(); setMediaIdx(i => i - 1) }}
                  style={{
                    position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                    width: 28, height: 28, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', color: '#fff',
                  }}
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              {mediaIdx < post.medias.length - 1 && (
                <button
                  onClick={e => { e.stopPropagation(); setMediaIdx(i => i + 1) }}
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                    width: 28, height: 28, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', color: '#fff',
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              )}
              <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
                {post.medias.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: i === mediaIdx ? '#0095f6' : 'rgba(255,255,255,0.6)',
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0 6px', gap: 14 }}>
        <button
          onClick={handleLike}
          style={{
            display: 'flex', alignItems: 'center',
            color: liked ? '#ed4956' : 'var(--text)',
            background: 'none', border: 'none', cursor: 'pointer',
            transition: 'transform 0.1s',
          }}
        >
          <Heart
            size={26}
            strokeWidth={1.5}
            fill={liked ? '#ed4956' : 'none'}
            style={{ transition: 'transform 0.15s' }}
          />
        </button>
        <button
          onClick={() => {
            setShowComments(true)
            setTimeout(() => commentRef.current?.focus(), 100)
          }}
          style={{ display: 'flex', alignItems: 'center', color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <MessageCircle size={26} strokeWidth={1.5} />
        </button>
        <button style={{ display: 'flex', alignItems: 'center', color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <Send size={24} strokeWidth={1.5} />
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleSave}
          style={{ display: 'flex', alignItems: 'center', color: saved ? '#f5a623' : 'var(--text)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Bookmark size={26} strokeWidth={1.5} fill={saved ? '#f5a623' : 'none'} />
        </button>
      </div>

      {/* Likes */}
      {likesCount > 0 && (
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 5 }}>
          {formatLikes(likesCount)}
        </p>
      )}

      {/* Caption */}
      {caption.length > 0 && (
        <p style={{ fontSize: 14, marginBottom: 5, lineHeight: 1.5 }}>
          <span style={{ fontWeight: 600, marginRight: 4 }}>{post.user.username}</span>
          {captionExpanded ? caption : captionShort}
          {captionTruncated && !captionExpanded && (
            <>
              {'… '}
              <button
                onClick={() => setCaptionExpanded(true)}
                style={{ color: 'var(--text2)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                ещё
              </button>
            </>
          )}
        </p>
      )}

      {/* View all comments */}
      {localCommentsCount > 0 && !showComments && (
        <button
          onClick={() => setShowComments(true)}
          style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'block' }}
        >
          Просмотреть все комментарии ({localCommentsCount})
        </button>
      )}

      {/* Comments */}
      {showComments && (
        <div style={{ marginBottom: 6 }}>
          {comments.map(c => (
            <PostCardComment
              key={c.id}
              comment={c}
              myId={user?.id}
              onDelete={() => {
                commentsApi.delete(c.id).then(() => {
                  setLocalCommentsCount(n => Math.max(0, n - 1))
                  refetchComments()
                })
              }}
              onReply={(id, username) => {
                setReplyTo({ id, username })
                setTimeout(() => commentRef.current?.focus(), 0)
              }}
            />
          ))}
        </div>
      )}

      {/* Reply banner */}
      {replyTo && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', marginBottom: 4 }}>
          <span style={{ color: 'var(--text2)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <CornerDownRight size={12} /> Ответ @{replyTo.username}
          </span>
          <button onClick={() => { setReplyTo(null); setCommentText('') }} style={{ color: 'var(--text2)', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Add comment */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4,
      }}>
        <input
          ref={commentRef}
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          placeholder={replyTo ? `Ответить @${replyTo.username}...` : 'Добавьте комментарий...'}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: 'var(--text)', fontSize: 14, fontFamily: 'inherit',
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && commentText.trim() && !addComment.isPending) {
              addComment.mutate()
            }
          }}
        />
        {commentText.trim() && (
          <button
            onClick={() => addComment.mutate()}
            disabled={addComment.isPending}
            style={{
              color: '#0095f6', fontWeight: 600, fontSize: 14,
              background: 'none', border: 'none', cursor: 'pointer',
              opacity: addComment.isPending ? 0.6 : 1,
            }}
          >
            Опубликовать
          </button>
        )}
      </div>
    </article>
  )
}

function PostCardComment({
  comment, myId, onDelete, onReply,
}: {
  comment: Comment
  myId?: number
  onDelete: () => void
  onReply: (id: number, username: string) => void
}) {
  const [liked, setLiked] = useState(comment.is_liked)
  const [likesCount, setLikesCount] = useState(comment.likes_count)
  const [showReplies, setShowReplies] = useState(false)
  const [replies, setReplies] = useState<Comment[]>([])
  const [loadingReplies, setLoadingReplies] = useState(false)

  function handleLike() {
    const was = liked
    setLiked(!was)
    setLikesCount(c => was ? c - 1 : c + 1)
    const call = was ? commentsApi.unlikeComment : commentsApi.likeComment
    call(comment.id).catch(() => { setLiked(was); setLikesCount(c => was ? c + 1 : c - 1) })
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

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
          {comment.user.photo
            ? <img src={mediaUrl(comment.user.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--text2)', fontSize: 11 }}>{comment.user.username[0].toUpperCase()}</div>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, lineHeight: 1.4 }}>
            <span style={{ fontWeight: 600, marginRight: 4 }}>{comment.user.username}</span>
            {comment.text}
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, alignItems: 'center' }}>
            <span style={{ color: 'var(--text2)', fontSize: 12 }}>{formatTime(comment.created_at)}</span>
            {likesCount > 0 && <span style={{ color: 'var(--text2)', fontSize: 12 }}>{likesCount} нрав.</span>}
            <button
              onClick={() => onReply(comment.id, comment.user.username)}
              style={{ color: 'var(--text2)', fontSize: 12, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Ответить
            </button>
            {myId === comment.user.id && (
              <button onClick={onDelete} style={{ color: 'var(--text2)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Удалить
              </button>
            )}
          </div>
        </div>
        <button onClick={handleLike} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0 0 4px' }}>
          <Heart size={12} strokeWidth={1.5} fill={liked ? '#ed4956' : 'none'} stroke={liked ? '#ed4956' : 'var(--text2)'} />
        </button>
      </div>

      {comment.replies_count > 0 && (
        <div style={{ marginLeft: 36, marginTop: 4 }}>
          <button
            onClick={toggleReplies}
            style={{ color: 'var(--text2)', fontSize: 12, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ display: 'inline-block', width: 20, height: 1, background: 'var(--text2)', verticalAlign: 'middle' }} />
            {loadingReplies ? '...' : showReplies ? 'Скрыть' : `Ответы (${comment.replies_count})`}
          </button>
          {showReplies && replies.map(r => (
            <div key={r.id} style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
                {r.user.photo
                  ? <img src={mediaUrl(r.user.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--text2)', fontSize: 9 }}>{r.user.username[0].toUpperCase()}</div>
                }
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 600, marginRight: 4 }}>{r.user.username}</span>{r.text}
                </p>
                <span style={{ color: 'var(--text2)', fontSize: 11 }}>{formatTime(r.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
