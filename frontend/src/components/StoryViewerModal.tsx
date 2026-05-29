import { useState, useEffect, useRef } from 'react'
import { X, MoreHorizontal, Heart, Send, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { storiesApi, chatsApi, mediaUrl, formatTime } from '../api'
import { useAuth } from '../store/auth'
import type { Story, StoryGroup } from '../types'

interface Props {
  group: StoryGroup
  onClose: () => void
}

const DURATION = 5000

export default function StoryViewerModal({ group, onClose }: Props) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [idx, setIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [liked, setLiked] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [likeAnim, setLikeAnim] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replySent, setReplySent] = useState(false)
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const startTimeRef = useRef<number>(0)
  const pausedAtRef = useRef<number>(0)
  const rafRef = useRef<number>(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const story = group.stories[idx]
  const isOwn = story.user.id === user?.id

  const viewMutation = useMutation({
    mutationFn: (id: number) => storiesApi.view(id),
  })

  const replyMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data: chat } = await chatsApi.create([story.user.id], false)
      await chatsApi.sendMessage(chat.id, text)
    },
    onSuccess: () => {
      setReplyText('')
      setReplySent(true)
      setTimeout(() => setReplySent(false), 2000)
      qc.invalidateQueries({ queryKey: ['chats'] })
    },
  })

  function handleLike() {
    const wasLiked = liked
    const newLiked = !wasLiked
    setLiked(newLiked)
    setLikeAnim(true)
    setTimeout(() => setLikeAnim(false), 350)
    const call = wasLiked ? storiesApi.unlike : storiesApi.like
    call(story.id)
      .then(() => {
        // Update the cached stories feed so is_liked persists on reopen
        qc.setQueryData<Story[]>(['stories-feed'], old =>
          old?.map(s => s.id === story.id ? { ...s, is_liked: newLiked } : s)
        )
      })
      .catch(() => setLiked(wasLiked))
  }

  function sendReply() {
    if (!replyText.trim() || replyMutation.isPending) return
    replyMutation.mutate(replyText.trim())
  }

  useEffect(() => {
    viewMutation.mutate(story.id)
    setProgress(0)
    setLiked(story.is_liked ?? false)
    setPaused(false)
    cancelAnimationFrame(rafRef.current)

    if (story.type === 'video') {
      // Explicitly play the video (autoPlay is unreliable)
      setTimeout(() => {
        const v = videoRef.current
        if (v) { v.currentTime = 0; v.play().catch(() => {}) }
      }, 50)
      return
    }

    startTimeRef.current = performance.now()
    pausedAtRef.current = 0

    function tick(now: number) {
      const elapsed = now - startTimeRef.current
      const pct = Math.min(elapsed / DURATION, 1)
      setProgress(pct)
      if (pct < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        goNext()
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [idx])

  useEffect(() => {
    if (story.type === 'video') {
      const v = videoRef.current
      if (!v) return
      paused ? v.pause() : v.play().catch(() => {})
      return
    }
    cancelAnimationFrame(rafRef.current)
    if (!paused) {
      startTimeRef.current = performance.now() - pausedAtRef.current
      function tick(now: number) {
        const elapsed = now - startTimeRef.current
        const pct = Math.min(elapsed / DURATION, 1)
        setProgress(pct)
        if (pct < 1) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          goNext()
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    } else {
      pausedAtRef.current = performance.now() - startTimeRef.current
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [paused])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx])

  function goNext() {
    if (idx < group.stories.length - 1) setIdx(i => i + 1)
    else onClose()
  }

  function goPrev() {
    if (idx > 0) setIdx(i => i - 1)
    else onClose()
  }

  function handleDelete() {
    storiesApi.delete(story.id).then(() => {
      qc.invalidateQueries({ queryKey: ['stories-feed'] })
      onClose()
    })
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 20, right: 20,
          color: '#fff', zIndex: 20, display: 'flex', alignItems: 'center',
          background: 'none', border: 'none', cursor: 'pointer',
          opacity: 0.9,
        }}
      >
        <X size={30} />
      </button>

      {/* Prev story nav */}
      {idx > 0 && (
        <button
          onClick={goPrev}
          style={{
            position: 'absolute', left: 'calc(50% - 240px)',
            top: '50%', transform: 'translateY(-50%)',
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', zIndex: 10,
          }}
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Next story nav */}
      {(idx < group.stories.length - 1) && (
        <button
          onClick={goNext}
          style={{
            position: 'absolute', right: 'calc(50% - 240px)',
            top: '50%', transform: 'translateY(-50%)',
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', zIndex: 10,
          }}
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Story card */}
      <div
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onMouseLeave={() => setPaused(false)}
        style={{
          position: 'relative',
          width: 480,
          height: 'min(920px, 96vh)',
          borderRadius: 14,
          overflow: 'hidden',
          background: '#1a1a1a',
          flexShrink: 0,
          userSelect: 'none',
          boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
        }}
      >
        {/* Media fills the card */}
        {story.type === 'video' ? (
          <video
            ref={videoRef}
            key={story.id}
            src={mediaUrl(story.url)}
            autoPlay
            playsInline
            preload="auto"
            muted={muted}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            onTimeUpdate={e => {
              const v = e.currentTarget
              if (v.duration) setProgress(v.currentTime / v.duration)
            }}
            onEnded={goNext}
          />
        ) : (
          <img
            key={story.id}
            src={mediaUrl(story.url)}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
            draggable={false}
          />
        )}

        {/* Top gradient overlay */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 140,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)',
          zIndex: 2, pointerEvents: 'none',
        }} />

        {/* Bottom gradient overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 160,
          background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)',
          zIndex: 2, pointerEvents: 'none',
        }} />

        {/* Progress bars */}
        <div style={{
          position: 'absolute', top: 12, left: 10, right: 10,
          display: 'flex', gap: 4, zIndex: 5,
        }}>
          {group.stories.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 2.5,
              background: 'rgba(255,255,255,0.4)',
              borderRadius: 2, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                background: '#fff',
                borderRadius: 2,
                width: i < idx ? '100%' : i === idx ? `${progress * 100}%` : '0%',
              }} />
            </div>
          ))}
        </div>

        {/* User info row */}
        <div style={{
          position: 'absolute', top: 24, left: 12, right: 12,
          display: 'flex', alignItems: 'center', gap: 10,
          zIndex: 5, paddingTop: 8,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            overflow: 'hidden', flexShrink: 0,
            border: '2px solid #fff',
          }}>
            {story.user.photo
              ? <img src={mediaUrl(story.user.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', background: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>{story.user.username[0].toUpperCase()}</div>
            }
          </div>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 14, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
            {story.user.username}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
            {formatTime(story.created_at)}
          </span>
          <div style={{ flex: 1 }} />
          {story.type === 'video' && (
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); setMuted(m => !m) }}
              style={{ color: '#fff', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 }}
            >
              {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          )}
          {isOwn ? (
            <div style={{ position: 'relative' }}>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); setShowMenu(m => !m) }}
                style={{ color: '#fff', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 }}
              >
                <MoreHorizontal size={20} />
              </button>
              {showMenu && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4,
                  background: '#222', border: '1px solid #333',
                  borderRadius: 10, overflow: 'hidden', minWidth: 150,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.7)', zIndex: 20,
                }}>
                  <button
                    onClick={handleDelete}
                    style={{
                      display: 'block', width: '100%', padding: '13px 16px',
                      textAlign: 'left', color: '#ed4956', fontWeight: 700,
                      fontSize: 14, background: 'none', border: 'none', cursor: 'pointer',
                    }}
                  >
                    Удалить
                  </button>
                  <button
                    onClick={() => setShowMenu(false)}
                    style={{
                      display: 'block', width: '100%', padding: '13px 16px',
                      textAlign: 'left', color: '#fff', fontSize: 14,
                      borderTop: '1px solid #333', background: 'none', border: 'none', cursor: 'pointer',
                    }}
                  >
                    Отмена
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Tap zones (left / right) */}
        <div
          style={{ position: 'absolute', left: 0, top: 80, width: '40%', height: 'calc(100% - 160px)', cursor: 'pointer', zIndex: 3 }}
          onMouseDown={e => e.stopPropagation()}
          onClick={goPrev}
        />
        <div
          style={{ position: 'absolute', right: 0, top: 80, width: '40%', height: 'calc(100% - 160px)', cursor: 'pointer', zIndex: 3 }}
          onMouseDown={e => e.stopPropagation()}
          onClick={goNext}
        />

        {/* Bottom reply bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '12px 14px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          zIndex: 5,
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              ref={inputRef}
              value={replySent ? '✓ Отправлено' : replyText}
              onChange={e => setReplyText(e.target.value)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === 'Enter') sendReply() }}
              placeholder={`Ответить ${story.user.username}...`}
              readOnly={replySent}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.12)',
                border: `1.5px solid ${replySent ? '#4caf50' : 'rgba(255,255,255,0.5)'}`,
                borderRadius: 24,
                padding: '10px 18px',
                color: replySent ? '#4caf50' : '#fff',
                fontSize: 14,
                outline: 'none',
                fontFamily: 'inherit',
                backdropFilter: 'blur(4px)',
                transition: 'border-color 0.2s, color 0.2s',
              }}
            />
          </div>

          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); handleLike() }}
            style={{
              flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
              color: liked ? '#ed4956' : '#fff', display: 'flex', alignItems: 'center',
              filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
            }}
          >
            <Heart
              size={28}
              strokeWidth={1.8}
              fill={liked ? '#ed4956' : 'none'}
              style={{ transition: 'transform 0.2s', transform: likeAnim ? 'scale(1.4)' : 'scale(1)' }}
            />
          </button>

          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); sendReply() }}
            disabled={replyMutation.isPending || !replyText.trim()}
            style={{
              flexShrink: 0, background: 'none', border: 'none', cursor: replyText.trim() ? 'pointer' : 'default',
              color: replyText.trim() ? '#0095f6' : 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center',
              filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
              opacity: replyMutation.isPending ? 0.6 : 1,
            }}
          >
            <Send size={26} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </div>
  )
}
