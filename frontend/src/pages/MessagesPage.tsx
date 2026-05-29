import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Send, Phone, Video, Info, Search, Edit, Smile, Mic, X, ChevronLeft, Crown, Shield, UserMinus, UserPlus, Camera, Ban } from 'lucide-react'
import { chatsApi, uploadApi, postsApi, blocksApi, usersApi, mediaUrl, formatTime } from '../api'
import { useAuth } from '../store/auth'
import type { Chat, ChatMember, Message, Post } from '../types'
import ReelsViewer from '../components/ReelsViewer'

const EMOJIS = ['😀','😂','🥰','😍','🤩','😎','🤔','😅','😭','😤','🤗','😘','🥳','😁','😊','😋','😜','🤪','😴','🤓','👍','👎','❤️','💔','🔥','💯','✅','🎉','🎊','🙏','👏','💪','🤝','👀','💀','🌹','🌸','💫','⭐','🌙','☀️','🍕','🍔','🍣','🍩','🎂','🍷','🥂','☕','🐶','🐱','🦋','🌈','🏆','🎵','🎮','📱','💻','📷','🌍','🚀','✈️','🏖️','🏠','💰','🎁','📚','🔑','💎','🎯','🤣','😒','😔','😠','🤭','🤫','😬','😱','🙄','😏','🫶','🫂','🥹','🫠','🤌','🦄','🐸','🐼','🦊','🐨']

function parsePost(text?: string | null) {
  if (!text?.startsWith('__POST__:')) return null
  try { return JSON.parse(text.slice(9)) } catch { return null }
}

const WAVEFORM = [3,5,8,12,9,6,4,10,14,8,5,7,11,9,6,4,8,13,7,5,9,11,6,4,8,12,7,5,3,6]

function VoiceMessage({ src, isMe }: { src: string; isMe: boolean }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  function toggle() {
    const a = audioRef.current
    if (!a) return
    playing ? a.pause() : a.play()
    setPlaying(p => !p)
  }

  function fmt(s: number) {
    if (!s || isNaN(s)) return '0:00'
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  const accent = isMe ? '#fff' : '#0095f6'
  const dim = isMe ? 'rgba(255,255,255,0.35)' : 'var(--border)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', minWidth: 220, maxWidth: 280 }}>
      <audio ref={audioRef} src={src} style={{ display: 'none' }}
        onTimeUpdate={e => { const a = e.currentTarget; setCurrent(a.currentTime); setProgress(a.duration ? a.currentTime / a.duration : 0) }}
        onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrent(0) }}
      />

      {/* Play / Pause */}
      <button onClick={toggle} style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: isMe ? 'rgba(255,255,255,0.25)' : 'rgba(0,149,246,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
        {playing
          ? <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><rect x="5" y="3" width="5" height="18" rx="1"/><rect x="14" y="3" width="5" height="18" rx="1"/></svg>
          : <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24" style={{ marginLeft: 2 }}><path d="M6 4l15 8-15 8V4z"/></svg>
        }
      </button>

      {/* Waveform */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2, height: 26, cursor: 'pointer' }}
        onClick={e => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
          const ratio = (e.clientX - rect.left) / rect.width
          if (audioRef.current) { audioRef.current.currentTime = ratio * (audioRef.current.duration || 0); setProgress(ratio) }
        }}>
        {WAVEFORM.map((h, i) => (
          <div key={i} style={{ flex: 1, borderRadius: 2, height: `${h * 1.6}px`, background: i / WAVEFORM.length <= progress ? accent : dim, transition: 'background 0.15s' }} />
        ))}
      </div>

      {/* Timer */}
      <span style={{ fontSize: 12, color: isMe ? 'rgba(255,255,255,0.8)' : 'var(--text2)', flexShrink: 0, minWidth: 32, textAlign: 'right' }}>
        {fmt(playing || progress > 0 ? current : duration)}
      </span>
    </div>
  )
}

export default function MessagesPage() {
  const { user, token } = useAuth()
  const qc = useQueryClient()
  const [activeChatId, setActiveChatId] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [showEmojis, setShowEmojis] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatSearch, setNewChatSearch] = useState('')
  const [newChatResults, setNewChatResults] = useState<any[]>([])
  const [selectedUsers, setSelectedUsers] = useState<any[]>([])
  const [isGroup, setIsGroup] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [companionOnline, setCompanionOnline] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recSeconds, setRecSeconds] = useState(0)
  const [viewPost, setViewPost] = useState<Post | null>(null)
  const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'active'>('idle')
  const [callType, setCallType] = useState<'audio' | 'video'>('audio')
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [callSeconds, setCallSeconds] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isCamOff, setIsCamOff] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const incomingOfferRef = useRef<RTCSessionDescriptionInit | null>(null)
  const callTypeRef = useRef<'audio' | 'video'>('audio')
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: chats = [] } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const { data } = await chatsApi.getAll()
      return data as Chat[]
    },
    refetchInterval: 5_000,
  })

  const { data: messages = [], isLoading: historyLoading } = useQuery({
    queryKey: ['chat-messages', activeChatId],
    queryFn: async () => {
      const { data } = await chatsApi.getMessages(activeChatId!, 0, 100)
      return data as Message[]
    },
    enabled: !!activeChatId,
    refetchInterval: 2_000,
  })

  useEffect(() => {
    if (!activeChatId || !user || !token) return

    const chatId = activeChatId
    let alive = true

    function connect() {
      if (!alive) return
      const ws = new WebSocket(`ws://localhost:8000/chats/${chatId}/ws/${user!.id}?token=${token}`)
      wsRef.current = ws

      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
      }, 20_000)

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        if (msg.type === 'pong') return
        if (msg.type === 'presence') {
          setCompanionOnline(msg.online === true && msg.user_id !== user?.id)
          return
        }
        if (msg.type === 'message') {
          qc.invalidateQueries({ queryKey: ['chat-messages', chatId] })
          qc.invalidateQueries({ queryKey: ['chats'] })
        }
        if (msg.from_user_id === user?.id) return
        if (msg.type === 'call_offer') {
          incomingOfferRef.current = { type: 'offer', sdp: msg.sdp }
          callTypeRef.current = msg.call_type
          setCallType(msg.call_type)
          setCallState('incoming')
        }
        if (msg.type === 'call_answer') {
          peerRef.current?.setRemoteDescription({ type: 'answer', sdp: msg.sdp })
        }
        if (msg.type === 'call_ice') {
          peerRef.current?.addIceCandidate(new RTCIceCandidate(msg.candidate))
        }
        if (msg.type === 'call_end') {
          cleanupCall()
        }
      }

      ws.onclose = () => {
        clearInterval(ping)
        if (alive) reconnectRef.current = setTimeout(connect, 2_000)
      }

      ws.onerror = () => ws.close()
    }

    connect()

    return () => {
      alive = false
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [activeChatId, user?.id, token])

  useEffect(() => {
    if (!activeChatId) return
    setCompanionOnline(false)
    chatsApi.markAllRead(activeChatId).then(() => {
      qc.invalidateQueries({ queryKey: ['chats'] })
    }).catch(() => {})
  }, [activeChatId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
    }
  }, [callState])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  useEffect(() => {
    if (!showEmojis) return
    function handleClick(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojis(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showEmojis])

  function sendMessage() {
    const t = text.trim()
    if (!t || !activeChatId || !user) return
    setText('')

    // Show message instantly for sender
    const tempId = -Date.now()
    qc.setQueryData(['chat-messages', activeChatId], (old: Message[] = []) => [
      ...old,
      { id: tempId, chat_id: activeChatId, user, text: t, created_at: new Date().toISOString() } as Message,
    ])

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', text: t }))
    } else {
      chatsApi.sendMessage(activeChatId, t)
    }
  }

  async function openPost(postId: number) {
    try {
      const { data } = await postsApi.getPost(postId)
      setViewPost(data as Post)
    } catch {}
  }

  function fmtCallTime(s: number) {
    const m = Math.floor(s / 60)
    return `${m}:${String(s % 60).padStart(2, '0')}`
  }

  function cleanupCall() {
    peerRef.current?.close()
    peerRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    if (callTimerRef.current) clearInterval(callTimerRef.current)
    callTimerRef.current = null
    incomingOfferRef.current = null
    setCallState('idle')
    setRemoteStream(null)
    setCallSeconds(0)
    setIsMuted(false)
    setIsCamOff(false)
  }

  function buildPeer() {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    })
    peer.onicecandidate = (e) => {
      if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'call_ice', candidate: e.candidate.toJSON() }))
      }
    }
    peer.ontrack = (e) => {
      setRemoteStream(e.streams[0])
      setCallState('active')
      if (!callTimerRef.current) {
        callTimerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000)
      }
    }
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed') cleanupCall()
    }
    return peer
  }

  async function startCall(type: 'audio' | 'video') {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    setCallType(type)
    callTypeRef.current = type
    setCallState('calling')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
      localStreamRef.current = stream
      const peer = buildPeer()
      peerRef.current = peer
      stream.getTracks().forEach(t => peer.addTrack(t, stream))
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      wsRef.current.send(JSON.stringify({ type: 'call_offer', sdp: offer.sdp, call_type: type }))
    } catch { cleanupCall() }
  }

  async function acceptCall() {
    if (!incomingOfferRef.current || !wsRef.current) return
    setCallState('active')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callTypeRef.current === 'video' })
      localStreamRef.current = stream
      const peer = buildPeer()
      peerRef.current = peer
      stream.getTracks().forEach(t => peer.addTrack(t, stream))
      await peer.setRemoteDescription({ type: 'offer', sdp: incomingOfferRef.current.sdp as string })
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)
      wsRef.current.send(JSON.stringify({ type: 'call_answer', sdp: answer.sdp }))
      if (!callTimerRef.current) {
        callTimerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000)
      }
    } catch { cleanupCall() }
  }

  function rejectCall() {
    wsRef.current?.send(JSON.stringify({ type: 'call_end' }))
    incomingOfferRef.current = null
    setCallState('idle')
  }

  function endCall() {
    wsRef.current?.send(JSON.stringify({ type: 'call_end' }))
    cleanupCall()
  }

  function toggleMute() {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setIsMuted(m => !m)
  }

  function toggleCamera() {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    setIsCamOff(c => !c)
  }

  async function searchUsers(q: string) {
    setNewChatSearch(q)
    if (!q.trim()) { setNewChatResults([]); return }
    try {
      const { data } = await (await import('../api')).usersApi.search(q)
      setNewChatResults((data as any[]).filter(u => u.id !== user?.id))
    } catch {}
  }

  function toggleSelectUser(u: any) {
    setSelectedUsers(prev =>
      prev.find(x => x.id === u.id) ? prev.filter(x => x.id !== u.id) : [...prev, u]
    )
  }

  async function createNewChat() {
    if (selectedUsers.length === 0) return
    try {
      const { data } = await chatsApi.create(
        selectedUsers.map(u => u.id),
        isGroup,
        isGroup ? groupName || 'Группа' : undefined,
      )
      qc.invalidateQueries({ queryKey: ['chats'] })
      setActiveChatId((data as any).id)
      setShowNewChat(false)
      setNewChatSearch('')
      setNewChatResults([])
      setSelectedUsers([])
      setIsGroup(false)
      setGroupName('')
    } catch {}
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      const recorder = new MediaRecorder(stream)
      let cancelled = false
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (recTimerRef.current) clearInterval(recTimerRef.current)
        setRecSeconds(0)
        if (cancelled) return
        if (audioChunksRef.current.length === 0) return
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        const ext = mimeType === 'audio/webm' ? 'webm' : 'ogg'
        const file = new File([blob], `voice_${Date.now()}.${ext}`, { type: mimeType })
        setUploading(true)
        try {
          const url = await uploadApi.upload(file)
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'message', text: '__VOICE__', media_url: url }))
          } else {
            await chatsApi.sendMessage(activeChatId!, '__VOICE__', url)
            qc.invalidateQueries({ queryKey: ['chat-messages', activeChatId] })
          }
        } catch (err: any) {
          alert('Ошибка отправки: ' + (err?.response?.data?.detail ?? err?.message ?? 'unknown'))
        } finally {
          setUploading(false)
        }
      }
      ;(recorder as any)._cancel = () => { cancelled = true }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
      setRecSeconds(0)
      recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000)
    } catch (err: any) {
      alert('Нет доступа к микрофону: ' + (err?.message ?? ''))
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !activeChatId || !user) return
    e.target.value = ''
    setUploading(true)
    try {
      const url = await uploadApi.upload(file)
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'message', text: null, media_url: url }))
      } else {
        await chatsApi.sendMessage(activeChatId, '', url)
        qc.invalidateQueries({ queryKey: ['chat-messages', activeChatId] })
      }
    } finally {
      setUploading(false)
    }
  }

  function getOnlineLabel(chat: Chat): { label: string; online: boolean } {
    if (chat.is_group) {
      return { label: `${chat.members_count} участников`, online: false }
    }
    const comp = chat.companion
    if (!comp) return { label: '', online: false }
    if (comp.is_online) return { label: 'В сети', online: true }
    if (comp.last_seen_at) {
      return { label: `Был(а) в сети ${formatTime(comp.last_seen_at)}`, online: false }
    }
    return { label: '', online: false }
  }

  const activeChat = chats.find(c => c.id === activeChatId)
  const chatName = activeChat?.is_group ? activeChat.name : activeChat?.companion?.username
  const chatPhoto = activeChat?.is_group ? activeChat.photo : activeChat?.companion?.photo
  const activeChatStatus = activeChat ? getOnlineLabel(activeChat) : { label: '', online: false }
  const isOnline = companionOnline || activeChatStatus.online

  const filteredChats = search.trim()
    ? chats.filter(c => {
        const name = c.is_group ? c.name : c.companion?.username
        return name?.toLowerCase().includes(search.toLowerCase())
      })
    : chats

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── Left panel ── */}
      <div style={{ width: 360, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <span style={{ fontWeight: 700, fontSize: 17 }}>{user?.username}</span>
            <span style={{ color: 'var(--text2)', fontSize: 13 }}>▾</span>
          </div>
          <button onClick={() => setShowNewChat(true)} style={{ color: 'var(--text)', display: 'flex', padding: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
            <Edit size={22} strokeWidth={1.5} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--input-bg)', borderRadius: 10, padding: '9px 14px' }}>
            <Search size={15} color="var(--text2)" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit' }}
            />
          </div>
        </div>

        {/* Section label */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px 10px' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Сообщения</span>
          <button style={{ color: '#0095f6', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Запросы</button>
        </div>

        {/* Chat list */}
        <div style={{ flex: 1, overflowY: 'auto' }} className="no-scroll">
          {filteredChats.length === 0 && (
            <p style={{ color: 'var(--text2)', textAlign: 'center', padding: '32px 16px', fontSize: 14 }}>Чаты не найдены</p>
          )}
          {filteredChats.map(chat => {
            const name = chat.is_group ? chat.name : chat.companion?.username
            const photo = chat.is_group ? chat.photo : chat.companion?.photo
            const { online } = getOnlineLabel(chat)
            const subtitle = chat.last_message || (chat.is_group ? `${chat.members_count} участников` : 'Нет сообщений')
            const isActive = activeChatId === chat.id

            return (
              <div
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '10px 16px', cursor: 'pointer',
                  background: isActive ? 'var(--hover)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--hover)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                {/* Avatar + online dot */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)' }}>
                    {photo
                      ? <img src={mediaUrl(photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, color: 'var(--text2)' }}>{name?.[0]?.toUpperCase()}</div>
                    }
                  </div>
                  {online && (
                    <div style={{ position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: '#31a24c', border: '2px solid var(--bg)' }} />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <p style={{ fontWeight: chat.unread_count > 0 ? 700 : 600, fontSize: 14 }}>{name}</p>
                    {chat.last_message_at && (
                      <span style={{ color: 'var(--text2)', fontSize: 12, flexShrink: 0, marginLeft: 8 }}>
                        {formatTime(chat.last_message_at)}
                      </span>
                    )}
                  </div>
                  <p style={{ color: chat.unread_count > 0 ? 'var(--text)' : 'var(--text2)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: chat.unread_count > 0 ? 600 : 400 }}>
                    {subtitle}
                  </p>
                </div>

                {/* Unread dot */}
                {chat.unread_count > 0 && (
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#0095f6', flexShrink: 0 }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Right panel ── */}
      {activeChatId ? (
        <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Chat header */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid var(--border)', gap: 14 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)' }}>
                {chatPhoto
                  ? <img src={mediaUrl(chatPhoto)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: 'var(--text2)' }}>{chatName?.[0]?.toUpperCase()}</div>
                }
              </div>
              {isOnline && (
                <div style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: '50%', background: '#31a24c', border: '2px solid var(--bg)' }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 15 }}>{chatName}</p>
              <p style={{ color: isOnline ? '#31a24c' : 'var(--text2)', fontSize: 13 }}>
                {isOnline ? 'В сети' : (activeChatStatus.label || '')}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 18 }}>
              {!activeChat?.is_group && (
                <>
                  <button onClick={() => startCall('audio')} style={{ color: 'var(--text)', display: 'flex', background: 'none', border: 'none', cursor: 'pointer' }}><Phone size={24} strokeWidth={1.5} /></button>
                  <button onClick={() => startCall('video')} style={{ color: 'var(--text)', display: 'flex', background: 'none', border: 'none', cursor: 'pointer' }}><Video size={24} strokeWidth={1.5} /></button>
                </>
              )}
              <button onClick={() => setShowInfo(s => !s)} style={{ color: showInfo ? '#0095f6' : 'var(--text)', display: 'flex', background: 'none', border: 'none', cursor: 'pointer' }}><Info size={24} strokeWidth={1.5} /></button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 3 }} className="no-scroll">
            {historyLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
                <div className="spinner" style={{ width: 28, height: 28 }} />
              </div>
            )}
            {!historyLoading && messages.length === 0 && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: 'var(--text2)', paddingTop: 60 }}>
                <p style={{ fontSize: 15 }}>Нет сообщений</p>
                <p style={{ fontSize: 13 }}>Начните переписку прямо сейчас</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isMe = msg.user?.id === user?.id
              const prevSameUser = i > 0 && messages[i - 1]?.user?.id === msg.user?.id
              const postData = parsePost(msg.text)

              return (
                <div key={msg.id ?? i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8, marginTop: prevSameUser ? 0 : 8 }}>
                  {/* Avatar for others */}
                  {!isMe && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)', flexShrink: 0, visibility: !prevSameUser ? 'visible' : 'hidden' }}>
                      {msg.user?.photo
                        ? <img src={mediaUrl(msg.user.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: 'var(--text2)' }}>{msg.user?.username?.[0]?.toUpperCase()}</div>
                      }
                    </div>
                  )}

                  {/* Post card */}
                  {postData ? (
                    <div onClick={() => openPost(postData.id)} style={{ maxWidth: 240, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg3)' }}>
                      <div style={{ position: 'relative', width: 240, height: 240 }}>
                        {postData.mediaType === 'video'
                          ? <video src={mediaUrl(postData.media)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <img src={mediaUrl(postData.media)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        }
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.15)' }}>
                          <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#fff' }}>Нажми для просмотра</div>
                        </div>
                      </div>
                      <div style={{ padding: '8px 12px 10px' }}>
                        <p style={{ fontWeight: 700, fontSize: 13 }}>@{postData.username}</p>
                        {postData.caption && <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{postData.caption}</p>}
                        <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6 }}>{formatTime(msg.created_at)}</p>
                      </div>
                    </div>

                  ) : (msg.text === '__VOICE__' || msg.media_url?.match(/\.(webm|ogg|mp3|wav|m4a|aac)$/i)) && msg.media_url ? (
                    <div style={{
                      borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: isMe ? '#0095f6' : 'var(--bg3)',
                      overflow: 'hidden',
                    }}>
                      <VoiceMessage src={mediaUrl(msg.media_url)} isMe={isMe} />
                    </div>

                  ) : msg.media_url ? (
                    /* Photo / video */
                    <div style={{ maxWidth: '65%', borderRadius: 14, overflow: 'hidden' }}>
                      {msg.media_url.match(/\.(mp4|mov|avi)$/i) ? (
                        <video src={mediaUrl(msg.media_url)} controls style={{ maxWidth: 280, maxHeight: 280, display: 'block', borderRadius: 14 }} />
                      ) : (
                        <img src={mediaUrl(msg.media_url)} alt="" style={{ maxWidth: 280, maxHeight: 280, display: 'block', borderRadius: 14, objectFit: 'cover' }} />
                      )}
                      <p style={{ fontSize: 11, opacity: 0.6, textAlign: 'right', padding: '4px 8px' }}>{formatTime(msg.created_at)}</p>
                    </div>

                  ) : (
                    /* Text bubble */
                    <div style={{
                      maxWidth: '65%', padding: '10px 14px',
                      borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: isMe ? '#0095f6' : 'var(--bg3)',
                      color: isMe ? '#fff' : 'var(--text)',
                      fontSize: 14, lineHeight: 1.55, wordBreak: 'break-word',
                    }}>
                      {msg.text}
                      <p style={{ fontSize: 11, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', position: 'relative' }}>
            {/* Emoji picker */}
            {showEmojis && (
              <div ref={emojiRef} style={{
                position: 'absolute', bottom: '100%', left: 16, marginBottom: 8,
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 16, padding: 12, width: 320, zIndex: 50,
                boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4,
              }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => { setText(t => t + e); setShowEmojis(false) }}
                    style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, padding: 4, lineHeight: 1 }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--hover)')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = 'none')}
                  >{e}</button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setShowEmojis(s => !s)} style={{ color: showEmojis ? '#0095f6' : 'var(--text2)', display: 'flex', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                <Smile size={26} strokeWidth={1.5} />
              </button>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--bg3)', borderRadius: 22, padding: '10px 16px', border: '1px solid var(--border)', gap: 8 }}>
                <input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Напишите сообщение..."
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit' }}
                />
              </div>
              {recording ? (
                /* Recording indicator */
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#e0434e', animation: 'pulse 1s infinite' }} />
                  <span style={{ color: 'var(--text2)', fontSize: 14 }}>{Math.floor(recSeconds / 60)}:{String(recSeconds % 60).padStart(2, '0')}</span>
                  <button onClick={stopRecording} style={{ color: '#0095f6', fontWeight: 700, fontSize: 15, background: 'none', border: 'none', cursor: 'pointer' }}>
                    Отправить
                  </button>
                  <button onClick={() => { (mediaRecorderRef.current as any)?._cancel?.(); mediaRecorderRef.current?.stop(); setRecording(false); if (recTimerRef.current) clearInterval(recTimerRef.current); setRecSeconds(0) }}
                    style={{ color: 'var(--text2)', display: 'flex', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={22} />
                  </button>
                </div>
              ) : text.trim() ? (
                <button onClick={sendMessage} style={{ color: '#0095f6', fontWeight: 700, fontSize: 15, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  Отправить
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 14 }}>
                  <button onClick={startRecording} style={{ color: 'var(--text2)', display: 'flex', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Mic size={26} strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    style={{ color: uploading ? '#0095f6' : 'var(--text2)', display: 'flex', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="26" height="26">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                    </svg>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info panel */}
        {showInfo && activeChat && (
          <ChatInfoPanel
            chat={activeChat}
            myId={user?.id ?? 0}
            onClose={() => setShowInfo(false)}
            onChatUpdate={() => qc.invalidateQueries({ queryKey: ['chats'] })}
          />
        )}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <div style={{ width: 88, height: 88, borderRadius: '50%', border: '2px solid var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Send size={38} strokeWidth={1.2} style={{ marginLeft: 4 }} />
          </div>
          <p style={{ fontSize: 22, fontWeight: 300, color: 'var(--text)' }}>Ваши сообщения</p>
          <p style={{ fontSize: 14, color: 'var(--text2)' }}>Выберите чат слева, чтобы начать общение</p>
        </div>
      )}

      {/* New chat modal */}
      {showNewChat && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowNewChat(false); setSelectedUsers([]); setNewChatSearch(''); setNewChatResults([]); setIsGroup(false); setGroupName('') } }}>
          <div style={{ background: 'var(--bg)', borderRadius: 16, width: 400, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
              <button onClick={() => { setShowNewChat(false); setSelectedUsers([]); setNewChatSearch(''); setNewChatResults([]); setIsGroup(false); setGroupName('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', padding: 0 }}>
                <X size={20} />
              </button>
              <span style={{ fontWeight: 700, fontSize: 16 }}>Новое сообщение</span>
              <button onClick={createNewChat} disabled={selectedUsers.length === 0}
                style={{ background: 'none', border: 'none', cursor: selectedUsers.length ? 'pointer' : 'default', color: selectedUsers.length ? '#0095f6' : 'var(--text2)', fontWeight: 700, fontSize: 14, padding: 0 }}>
                Далее
              </button>
            </div>

            {/* Group toggle */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--text)' }}>
                <input type="checkbox" checked={isGroup} onChange={e => setIsGroup(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                Групповой чат
              </label>
              {isGroup && (
                <input value={groupName} onChange={e => setGroupName(e.target.value)}
                  placeholder="Название группы"
                  style={{ flex: 1, background: 'var(--input-bg)', border: 'none', borderRadius: 8, padding: '6px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
              )}
            </div>

            {/* Selected users */}
            {selectedUsers.length > 0 && (
              <div style={{ display: 'flex', gap: 8, padding: '10px 20px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
                {selectedUsers.map(u => (
                  <div key={u.id} onClick={() => toggleSelectUser(u)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,149,246,0.15)', borderRadius: 20, padding: '4px 10px 4px 6px', cursor: 'pointer' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)', flexShrink: 0 }}>
                      {u.photo ? <img src={mediaUrl(u.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text2)' }}>{u.username?.[0]?.toUpperCase()}</div>}
                    </div>
                    <span style={{ fontSize: 13, color: '#0095f6', fontWeight: 600 }}>{u.username}</span>
                    <X size={12} color="#0095f6" />
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--input-bg)', borderRadius: 10, padding: '8px 14px' }}>
                <Search size={15} color="var(--text2)" />
                <input value={newChatSearch} onChange={e => searchUsers(e.target.value)}
                  placeholder="Поиск пользователей..."
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit' }} />
              </div>
            </div>

            {/* Results */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {newChatResults.length === 0 && newChatSearch && (
                <p style={{ color: 'var(--text2)', textAlign: 'center', padding: '24px 16px', fontSize: 14 }}>Пользователи не найдены</p>
              )}
              {newChatResults.map(u => {
                const selected = !!selectedUsers.find(x => x.id === u.id)
                return (
                  <div key={u.id} onClick={() => { if (!isGroup) { setSelectedUsers([u]) } else { toggleSelectUser(u) } }}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 20px', cursor: 'pointer', background: selected ? 'var(--hover)' : 'transparent' }}
                    onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--hover)' }}
                    onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)', flexShrink: 0 }}>
                      {u.photo ? <img src={mediaUrl(u.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: 'var(--text2)' }}>{u.username?.[0]?.toUpperCase()}</div>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{u.username}</p>
                      {u.full_name && <p style={{ color: 'var(--text2)', fontSize: 13 }}>{u.full_name}</p>}
                    </div>
                    {selected && (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#0095f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Call overlay */}
      {callState !== 'idle' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: callType === 'video' && callState === 'active' ? '#000' : 'rgba(15,15,25,0.92)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Remote video (background for video call) */}
          {callType === 'video' && callState === 'active' && (
            <video ref={remoteVideoRef} autoPlay playsInline
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          {/* Local video (small corner preview) */}
          {callType === 'video' && (callState === 'active' || callState === 'calling') && (
            <video ref={localVideoRef} autoPlay playsInline muted
              style={{ position: 'absolute', bottom: 110, right: 24, width: 110, height: 150, objectFit: 'cover', borderRadius: 14, border: '2px solid rgba(255,255,255,0.25)', zIndex: 2 }} />
          )}

          {/* Info (avatar + name + status) */}
          <div style={{ position: 'relative', zIndex: 3, textAlign: 'center', color: '#fff', marginBottom: 40 }}>
            <div style={{ width: 90, height: 90, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 18px', background: '#333', boxShadow: '0 0 0 4px rgba(255,255,255,0.1)' }}>
              {chatPhoto
                ? <img src={mediaUrl(chatPhoto)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700 }}>{chatName?.[0]?.toUpperCase()}</div>
              }
            </div>
            <p style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{chatName}</p>
            <p style={{ fontSize: 15, opacity: 0.65 }}>
              {callState === 'calling' ? 'Вызов...' : callState === 'incoming' ? (callType === 'video' ? 'Входящий видеозвонок' : 'Входящий звонок') : fmtCallTime(callSeconds)}
            </p>
          </div>

          {/* Buttons */}
          <div style={{ position: 'relative', zIndex: 3, display: 'flex', gap: 28, alignItems: 'center' }}>
            {callState === 'incoming' ? (
              <>
                <div style={{ textAlign: 'center' }}>
                  <button onClick={rejectCall} style={{ width: 64, height: 64, borderRadius: '50%', background: '#e0253f', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="28" height="28"><path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 0112 19.3a19.5 19.5 0 01-5-5 19.79 19.79 0 01-2.62-7.82A2 2 0 016.34 4.5h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11l-1.27 1.27A16 16 0 0013.5 15.5l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  </button>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8 }}>Отклонить</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <button onClick={acceptCall} style={{ width: 64, height: 64, borderRadius: '50%', background: '#31a24c', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="28" height="28"><path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 0112 19.3a19.5 19.5 0 01-5-5 19.79 19.79 0 01-2.62-7.82A2 2 0 016.34 4.5h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11l-1.27 1.27A16 16 0 0013.5 15.5l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
                  </button>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8 }}>Принять</p>
                </div>
              </>
            ) : callState === 'calling' ? (
              <div style={{ textAlign: 'center' }}>
                <button onClick={endCall} style={{ width: 64, height: 64, borderRadius: '50%', background: '#e0253f', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="28" height="28"><path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 0112 19.3a19.5 19.5 0 01-5-5 19.79 19.79 0 01-2.62-7.82A2 2 0 016.34 4.5h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11l-1.27 1.27A16 16 0 0013.5 15.5l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                </button>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8 }}>Отменить</p>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center' }}>
                  <button onClick={toggleMute} style={{ width: 52, height: 52, borderRadius: '50%', background: isMuted ? '#e0253f' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    {isMuted
                      ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8"/></svg>
                      : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
                    }
                  </button>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8 }}>{isMuted ? 'Включить' : 'Выключить'}</p>
                </div>
                {callType === 'video' && (
                  <div style={{ textAlign: 'center' }}>
                    <button onClick={toggleCamera} style={{ width: 52, height: 52, borderRadius: '50%', background: isCamOff ? '#e0253f' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      {isCamOff
                        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 01-2-2V8a2 2 0 012-2h3m3-3h6l2 3h4a2 2 0 012 2v9.34"/><path d="M15 13a3 3 0 11-6 0"/></svg>
                        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                      }
                    </button>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8 }}>{isCamOff ? 'Камера вкл' : 'Камера выкл'}</p>
                  </div>
                )}
                <div style={{ textAlign: 'center' }}>
                  <button onClick={endCall} style={{ width: 64, height: 64, borderRadius: '50%', background: '#e0253f', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="28" height="28"><path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 0112 19.3a19.5 19.5 0 01-5-5 19.79 19.79 0 01-2.62-7.82A2 2 0 016.34 4.5h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11l-1.27 1.27A16 16 0 0013.5 15.5l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  </button>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8 }}>Завершить</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Post viewer overlay */}
      {viewPost && (
        <ReelsViewer posts={[viewPost]} onClose={() => setViewPost(null)} />
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  )
}

/* ── Chat Info Panel ── */
function ChatInfoPanel({ chat, myId, onClose, onChatUpdate }: {
  chat: Chat
  myId: number
  onClose: () => void
  onChatUpdate: () => void
}) {
  return chat.is_group
    ? <GroupInfoPanel chat={chat} myId={myId} onClose={onClose} onChatUpdate={onChatUpdate} />
    : <DMInfoPanel chat={chat} myId={myId} onClose={onClose} />
}

function GroupInfoPanel({ chat, myId, onClose, onChatUpdate }: {
  chat: Chat
  myId: number
  onClose: () => void
  onChatUpdate: () => void
}) {
  const qc = useQueryClient()
  const [editName, setEditName] = useState(false)
  const [nameVal, setNameVal] = useState(chat.name ?? '')
  const [uploading, setUploading] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const isOwner = chat.owner_id === myId

  const { data: members = [] } = useQuery({
    queryKey: ['chat-members', chat.id],
    queryFn: async () => {
      const { data } = await chatsApi.getMembers(chat.id)
      return data as ChatMember[]
    },
  })

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadApi.upload(file)
      await chatsApi.update(chat.id, { photo: url })
      onChatUpdate()
    } finally {
      setUploading(false)
    }
  }

  async function saveName() {
    if (!nameVal.trim()) return
    await chatsApi.update(chat.id, { name: nameVal.trim() })
    onChatUpdate()
    setEditName(false)
  }

  async function toggleAdmin(member: ChatMember) {
    const newRole = member.role === 'admin' ? 'member' : 'admin'
    await chatsApi.updateMemberRole(chat.id, member.user.id, newRole)
    qc.invalidateQueries({ queryKey: ['chat-members', chat.id] })
  }

  async function kickMember(member: ChatMember) {
    await chatsApi.removeMember(chat.id, member.user.id)
    qc.invalidateQueries({ queryKey: ['chat-members', chat.id] })
    onChatUpdate()
  }

  return (
    <div style={{
      width: 300, borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', background: 'var(--bg)',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex' }}>
          <ChevronLeft size={22} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 16 }}>Информация о группе</span>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }} className="no-scroll">
        {/* Group photo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 16px', gap: 12 }}>
          <div
            onClick={() => isOwner && photoRef.current?.click()}
            style={{ position: 'relative', width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)', cursor: isOwner ? 'pointer' : 'default', opacity: uploading ? 0.6 : 1 }}
          >
            {chat.photo
              ? <img src={mediaUrl(chat.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 26, color: 'var(--text2)' }}>{chat.name?.[0]?.toUpperCase()}</div>
            }
            {isOwner && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0'}
              >
                <Camera size={20} color="#fff" />
              </div>
            )}
          </div>
          {isOwner && <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />}

          {/* Group name */}
          {editName ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                autoFocus
                style={{ background: 'var(--input-bg)', border: 'none', borderRadius: 8, padding: '6px 12px', color: 'var(--text)', fontSize: 15, fontFamily: 'inherit', outline: 'none', width: 160 }}
              />
              <button onClick={saveName} style={{ color: '#0095f6', fontWeight: 700, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>OK</button>
              <button onClick={() => setEditName(false)} style={{ color: 'var(--text2)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 17 }}>{chat.name}</span>
              {isOwner && (
                <button onClick={() => setEditName(true)} style={{ color: 'var(--text2)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>✏️</button>
              )}
            </div>
          )}
          <span style={{ color: 'var(--text2)', fontSize: 14 }}>Группа · {members.length} участников</span>
        </div>

        {/* Members list */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 0' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', padding: '0 16px 10px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Участники
          </p>
          {members.map(m => {
            const isMe = m.user.id === myId
            const isMemberOwner = chat.owner_id === m.user.id
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)', flexShrink: 0 }}>
                  {m.user.photo
                    ? <img src={mediaUrl(m.user.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--text2)', fontSize: 14 }}>{m.user.username[0].toUpperCase()}</div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{m.user.username}{isMe ? ' (Вы)' : ''}</p>
                  <p style={{ fontSize: 12, color: isMemberOwner ? '#f5a623' : m.role === 'admin' ? '#0095f6' : 'var(--text2)' }}>
                    {isMemberOwner ? '👑 Владелец' : m.role === 'admin' ? '🛡️ Администратор' : 'Участник'}
                  </p>
                </div>
                {isOwner && !isMe && !isMemberOwner && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => toggleAdmin(m)}
                      title={m.role === 'admin' ? 'Снять права' : 'Назначить админом'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: m.role === 'admin' ? '#0095f6' : 'var(--text2)', display: 'flex', padding: 4 }}
                    >
                      <Shield size={16} />
                    </button>
                    <button
                      onClick={() => kickMember(m)}
                      title="Удалить из группы"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ed4956', display: 'flex', padding: 4 }}
                    >
                      <UserMinus size={16} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DMInfoPanel({ chat, myId, onClose }: { chat: Chat; myId: number; onClose: () => void }) {
  const navigate = useNavigate()
  const comp = chat.companion
  const [blocked, setBlocked] = useState(false)

  async function handleBlock() {
    if (!comp) return
    if (blocked) {
      await blocksApi.unblock(comp.id).catch(() => {})
      setBlocked(false)
    } else {
      await blocksApi.block(comp.id).catch(() => {})
      setBlocked(true)
    }
  }

  if (!comp) return null

  return (
    <div style={{
      width: 280, borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', background: 'var(--bg)',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex' }}>
          <ChevronLeft size={22} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 16 }}>Информация</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 16px 20px', gap: 10 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)' }}>
          {comp.photo
            ? <img src={mediaUrl(comp.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 26, color: 'var(--text2)' }}>{comp.username[0].toUpperCase()}</div>
          }
        </div>
        <p style={{ fontWeight: 700, fontSize: 18 }}>{comp.username}</p>
        <p style={{ fontSize: 13, color: comp.is_online ? '#31a24c' : 'var(--text2)' }}>
          {comp.is_online ? 'В сети' : comp.last_seen_at ? `Был(а) ${formatTime(comp.last_seen_at)}` : ''}
        </p>
        <button
          onClick={() => navigate(`/profile/${comp.username}`)}
          style={{ padding: '8px 20px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginTop: 4 }}
        >
          Открыть профиль
        </button>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', padding: '8px 0' }}>
        <button
          onClick={handleBlock}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            width: '100%', padding: '12px 18px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: blocked ? 'var(--text2)' : '#ed4956',
          }}
        >
          <Ban size={20} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            {blocked ? 'Разблокировать' : 'Заблокировать'}
          </span>
        </button>
      </div>
    </div>
  )
}
