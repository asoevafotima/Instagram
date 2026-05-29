import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Moon, Sun, LogOut, User, Lock, Bell, Shield, UserX, Tag } from 'lucide-react'
import { useAuth } from '../store/auth'
import { usersApi } from '../api'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, logout, setUser } = useAuth()
  const qc = useQueryClient()
  const [dark, setDark] = useState(localStorage.getItem('theme') !== 'light')
  const [isPrivate, setIsPrivate] = useState<boolean>(!!(user as any)?.is_private)

  const togglePrivate = useMutation({
    mutationFn: (val: boolean) => usersApi.updateMe({ is_private: val }),
    onSuccess: (_, val) => {
      setIsPrivate(val)
      setUser({ ...(user as any), is_private: val })
      qc.invalidateQueries({ queryKey: ['me'] })
    },
  })

  function toggleTheme() {
    const next = !dark
    setDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('light', !next)
  }

  function handleLogout() {
    logout()
    qc.clear()
    navigate('/login')
  }

  const Section = ({ title }: { title: string }) => (
    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', padding: '20px 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {title}
    </p>
  )

  const Toggle = ({ on }: { on: boolean }) => (
    <div style={{
      width: 44, height: 24, borderRadius: 12,
      background: on ? '#0095f6' : 'var(--border)',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 22 : 2,
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </div>
  )

  const Row = ({
    icon, label, sublabel, onClick, right,
  }: {
    icon: React.ReactNode
    label: string
    sublabel?: string
    onClick?: () => void
    right?: React.ReactNode
  }) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        width: '100%', padding: '14px 16px',
        background: 'var(--bg2)', border: 'none', borderRadius: 12,
        color: 'var(--text)', cursor: onClick ? 'pointer' : 'default',
        marginBottom: 2, textAlign: 'left',
      }}
      onMouseEnter={e => onClick && ((e.currentTarget as HTMLElement).style.background = 'var(--hover)')}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg2)'}
    >
      <span style={{ color: 'var(--text2)', display: 'flex', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>{label}</span>
        {sublabel && <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, lineHeight: 1.4 }}>{sublabel}</p>}
      </div>
      {right ?? (onClick ? <ChevronRight size={18} color="var(--text2)" /> : null)}
    </button>
  )

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 20px 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex', padding: 4, fontSize: 24 }}>
          ‹
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Настройки</h1>
      </div>

      {/* Аккаунт */}
      <Section title="Аккаунт" />
      <Row icon={<User size={20} />} label="Редактировать профиль" onClick={() => navigate('/profile/edit')} />
      <Row icon={<Lock size={20} />} label="Изменить пароль" onClick={() => {}} />

      {/* Конфиденциальность */}
      <Section title="Конфиденциальность" />

      {/* Закрытый аккаунт */}
      <Row
        icon={<UserX size={20} />}
        label="Закрытый аккаунт"
        sublabel={
          isPrivate
            ? 'Только одобренные подписчики видят ваши фото и видео.'
            : 'Все пользователи могут видеть ваши публикации.'
        }
        onClick={() => togglePrivate.mutate(!isPrivate)}
        right={
          <div style={{ opacity: togglePrivate.isPending ? 0.5 : 1, transition: 'opacity 0.2s' }}>
            <Toggle on={isPrivate} />
          </div>
        }
      />

      <Row icon={<Shield size={20} />} label="Заблокированные аккаунты" onClick={() => {}} />

      {/* Отметки */}
      <Section title="Отметки" />
      <Row
        icon={<Tag size={20} />}
        label="Отметки и упоминания"
        sublabel="Управление тем, кто может отмечать вас в публикациях"
        onClick={() => {}}
      />

      {/* Уведомления */}
      <Section title="Уведомления" />
      <Row icon={<Bell size={20} />} label="Уведомления" onClick={() => {}} />

      {/* Внешний вид */}
      <Section title="Внешний вид" />
      <Row
        icon={dark ? <Moon size={20} /> : <Sun size={20} />}
        label={dark ? 'Тёмная тема' : 'Светлая тема'}
        onClick={toggleTheme}
        right={<Toggle on={dark} />}
      />

      {/* Другое */}
      <Section title="Другое" />
      <Row
        icon={<LogOut size={20} />}
        label="Выйти из аккаунта"
        onClick={handleLogout}
        right={<span />}
      />

      <p style={{ marginTop: 32, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>
        {user?.username} · Instagram Clone
      </p>
    </div>
  )
}
