import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { usersApi, uploadApi, mediaUrl } from '../api'
import { useAuth } from '../store/auth'

const fieldStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg3)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '12px 14px',
  fontSize: 15,
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text)',
  marginBottom: 6,
  display: 'block',
}

export default function ProfileEditPage() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [username, setUsername] = useState(user?.username ?? '')
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [bio, setBio] = useState((user as any)?.bio ?? '')
  const [photo, setPhoto] = useState(user?.photo ?? '')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: () => usersApi.updateMe({ username, full_name: fullName, bio, photo }),
    onSuccess: (res) => {
      const updated = res.data
      setUser(updated)
      qc.invalidateQueries({ queryKey: ['me'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
      setSaved(true)
      setTimeout(() => {
        navigate(`/profile/${updated.username}`, { replace: true })
      }, 800)
    },
  })

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const url = await uploadApi.upload(file)
      setPhoto(url)
    } finally {
      setAvatarUploading(false)
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px 60px' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 0 24px', borderBottom: '1px solid var(--border)',
        marginBottom: 32,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex', padding: 4 }}
        >
          <ChevronLeft size={26} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>Редактирование профиля</h1>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || saved}
          style={{
            color: saved ? '#4cd964' : '#0095f6', fontWeight: 700, fontSize: 15,
            background: 'none', border: 'none', cursor: (save.isPending || saved) ? 'default' : 'pointer',
            opacity: save.isPending ? 0.6 : 1,
            transition: 'color 0.3s',
          }}
        >
          {saved ? '✓ Сохранено' : save.isPending ? 'Сохранение...' : 'Готово'}
        </button>
      </div>

      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 36 }}>
        <div
          onClick={() => avatarInputRef.current?.click()}
          style={{
            width: 100, height: 100, borderRadius: '50%', overflow: 'hidden',
            background: 'var(--bg3)', border: '1px solid var(--border)',
            cursor: 'pointer', position: 'relative',
            opacity: avatarUploading ? 0.6 : 1,
          }}
        >
          {photo
            ? <img src={mediaUrl(photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 700, color: 'var(--text2)' }}>
                {(username[0] ?? '?').toUpperCase()}
              </div>
          }
        </div>
        <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        <button
          onClick={() => avatarInputRef.current?.click()}
          disabled={avatarUploading}
          style={{
            marginTop: 12, color: '#0095f6', fontWeight: 600, fontSize: 14,
            background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          {avatarUploading ? 'Загрузка...' : 'Изменить фото'}
        </button>
      </div>

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div>
          <label style={labelStyle}>Имя</label>
          <input
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Имя"
            style={fieldStyle}
          />
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>
            Помогите людям найти вас по имени.
          </p>
        </div>

        <div>
          <label style={labelStyle}>Имя пользователя</label>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Имя пользователя"
            style={fieldStyle}
          />
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>
            Можно использовать буквы, цифры, точки и нижнее подчёркивание.
          </p>
        </div>

        <div>
          <label style={labelStyle}>О себе</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="О себе"
            rows={4}
            maxLength={150}
            style={{
              ...fieldStyle,
              resize: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
            }}
          />
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>
            {bio.length} / 150
          </p>
        </div>

      </div>

      {/* Save button (bottom) */}
      <button
        onClick={() => save.mutate()}
        disabled={save.isPending || saved}
        style={{
          marginTop: 32, width: '100%',
          background: saved ? '#4cd964' : '#0095f6', color: '#fff',
          border: 'none', borderRadius: 10,
          padding: '12px', fontWeight: 700, fontSize: 15,
          cursor: (save.isPending || saved) ? 'default' : 'pointer',
          opacity: save.isPending ? 0.7 : 1,
          transition: 'background 0.3s',
        }}
      >
        {saved ? '✓ Сохранено' : save.isPending ? 'Сохранение...' : 'Сохранить'}
      </button>
    </div>
  )
}
