import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home, Search, Compass, Film, MessageCircle, Heart, Plus,
  LogOut, Moon, Sun, Settings, Menu,
} from 'lucide-react'
import { useAuth } from '../store/auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi, chatsApi, mediaUrl } from '../api'
import type { Chat } from '../types'

interface Props {
  onCreatePost: () => void
  searchOpen?: boolean
  onSearchToggle?: () => void
  notifOpen?: boolean
  onNotifToggle?: () => void
}

export default function Navbar({ onCreatePost, searchOpen, onSearchToggle, notifOpen, onNotifToggle }: Props) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [moreOpen, setMoreOpen] = useState(false)
  const [dark, setDark] = useState(localStorage.getItem('theme') !== 'light')
  const moreRef = useRef<HTMLDivElement>(null)

  const { data: notifData } = useQuery({
    queryKey: ['notif-count'],
    queryFn: async () => {
      const { data } = await notificationsApi.getUnreadCount()
      return data as { unread_count: number }
    },
    refetchInterval: 15_000,
  })

  const { data: chatsData } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const { data } = await chatsApi.getAll()
      return data as Chat[]
    },
    refetchInterval: 15_000,
  })

  const notifCount = notifData?.unread_count ?? 0
  const msgCount = chatsData?.reduce((s, c) => s + (c.unread_count ?? 0), 0) ?? 0

  function toggleTheme() {
    const next = !dark
    setDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('light', !next)
    setMoreOpen(false)
  }

  function handleLogout() {
    logout()
    qc.clear()
    navigate('/login')
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const navLinks = [
    { to: '/feed', icon: Home, label: 'Главная' },
    { to: '/explore', icon: Compass, label: 'Интересное' },
    { to: '/reels', icon: Film, label: 'Reels' },
    { to: '/messages', icon: MessageCircle, label: 'Сообщения', badge: msgCount },
  ]

  const navItemStyle = {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '12px 12px', borderRadius: 10,
    color: 'var(--text)', fontWeight: 400, fontSize: 16,
    transition: 'background 0.15s', width: '100%',
  }

  return (
    <nav className={`sidebar${searchOpen ? ' sidebar-collapsed' : ''}${moreOpen ? ' sidebar-expanded' : ''}`}>
      {/* Logo */}
      <NavLink
        to="/feed"
        style={{ display: 'flex', alignItems: 'center', padding: '26px 12px 22px', textDecoration: 'none', color: 'var(--text)', minHeight: 60 }}
      >
        <span className="nav-logo-text" style={{ fontFamily: '"Dancing Script", "Billabong", cursive', fontSize: 28, lineHeight: 1, fontWeight: 700 }}>
          Instagram
        </span>
        <span className="nav-logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="26" height="26">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        </span>
      </NavLink>

      {/* Nav links */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Search button */}
        <button
          onClick={onSearchToggle}
          className="nav-item"
          style={{
            ...navItemStyle,
            background: 'none', border: 'none', cursor: 'pointer',
            fontWeight: searchOpen ? 700 : 400,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--hover)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
        >
          <Search size={24} strokeWidth={searchOpen ? 2.5 : 1.5} />
          <span className="nav-label">Поиск</span>
        </button>

        {/* Notifications button (opens sidebar panel) */}
        <button
          onClick={onNotifToggle}
          className="nav-item"
          style={{
            ...navItemStyle,
            background: 'none', border: 'none', cursor: 'pointer',
            fontWeight: notifOpen ? 700 : 400,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--hover)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
        >
          <div style={{ position: 'relative', flexShrink: 0, display: 'flex' }}>
            <Heart size={24} strokeWidth={notifOpen ? 2.5 : 1.5} />
            {notifCount > 0 && (
              <span style={{
                position: 'absolute', top: -5, right: -5,
                background: '#ed4956', color: '#fff',
                fontSize: 10, fontWeight: 700, borderRadius: 9999,
                minWidth: 16, height: 16, display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: '0 3px',
              }}>
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </div>
          <span className="nav-label">Уведомления</span>
        </button>

        {navLinks.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className="nav-item"
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '12px 12px', borderRadius: 10,
              color: 'var(--text)', textDecoration: 'none',
              fontWeight: isActive ? 700 : 400, fontSize: 16,
              position: 'relative', transition: 'background 0.15s',
            })}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--hover)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
          >
            <div style={{ position: 'relative', flexShrink: 0, display: 'flex' }}>
              <Icon size={24} strokeWidth={1.5} />
              {(badge ?? 0) > 0 && (
                <span style={{
                  position: 'absolute', top: -5, right: -5,
                  background: '#ed4956', color: '#fff',
                  fontSize: 10, fontWeight: 700, borderRadius: 9999,
                  minWidth: 16, height: 16, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                }}>
                  {(badge ?? 0) > 99 ? '99+' : badge}
                </span>
              )}
            </div>
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}

        {/* Create */}
        <button
          onClick={onCreatePost}
          className="nav-item"
          style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '12px 12px', borderRadius: 10,
            color: 'var(--text)', background: 'none',
            fontWeight: 400, fontSize: 16, width: '100%',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--hover)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
        >
          <div style={{ width: 24, height: 24, border: '1.8px solid currentColor', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Plus size={14} strokeWidth={2.5} />
          </div>
          <span className="nav-label">Создать</span>
        </button>

        {/* Profile */}
        <NavLink
          to={`/profile/${user?.username ?? ''}`}
          className="nav-item"
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '12px 12px', borderRadius: 10,
            color: 'var(--text)', textDecoration: 'none',
            fontWeight: isActive ? 700 : 400, fontSize: 16,
            transition: 'background 0.15s',
          })}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--hover)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
        >
          <div style={{ width: 24, height: 24, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--border)' }}>
            {user?.photo ? (
              <img src={mediaUrl(user.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg3)', color: 'var(--text2)', fontSize: 11, fontWeight: 700 }}>
                {user?.username?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
          <span className="nav-label">Профиль</span>
        </NavLink>
      </div>

      {/* Ещё (More) */}
      <div ref={moreRef} style={{ position: 'relative' }}>
        {moreOpen && (
          <div className="more-popup">
            <button className="more-popup-item" onClick={() => { navigate('/settings'); setMoreOpen(false) }}>
              <Settings size={18} />
              <span>Настройки</span>
            </button>
            <button className="more-popup-item" onClick={toggleTheme}>
              {dark ? <Sun size={18} /> : <Moon size={18} />}
              <span>{dark ? 'Светлая тема' : 'Тёмная тема'}</span>
            </button>
            <button className="more-popup-item" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Выйти из аккаунта</span>
            </button>
          </div>
        )}
        <button
          onClick={() => setMoreOpen(o => !o)}
          className="nav-item"
          style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '12px 12px', borderRadius: 10,
            color: 'var(--text)', background: 'none', width: '100%',
            fontWeight: 400, fontSize: 16, transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--hover)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
        >
          <Menu size={24} strokeWidth={1.5} />
          <span className="nav-label">Ещё</span>
        </button>
      </div>
    </nav>
  )
}
