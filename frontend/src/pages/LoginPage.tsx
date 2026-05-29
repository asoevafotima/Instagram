import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api'
import { useAuth } from '../store/auth'

/* ── palette (exact match to instagram.com dark) ── */
const BG     = '#0a0a0a'
const BORDER = '#363636'
const BLUE   = '#0095f6'
const WHITE  = '#ffffff'
const MUTED  = '#a8a8a8'

/* ── reliable image sources ── */
const P1 = 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=340&q=80'
const P2 = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=280&q=80'
const P3 = 'https://images.unsplash.com/photo-1488716820095-cbe80883c496?w=260&q=80'
const P4 = 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=60&q=80'

/* ─────────────────────────────────────
   Instagram gradient camera icon
───────────────────────────────────── */
function IgIcon() {
  return (
    <svg width="62" height="62" viewBox="0 0 62 62" fill="none">
      <defs>
        <radialGradient id="ig" cx="26%" cy="108%" r="140%">
          <stop offset="0%"   stopColor="#ffd600"/>
          <stop offset="14%"  stopColor="#ff7a00"/>
          <stop offset="32%"  stopColor="#ff0069"/>
          <stop offset="62%"  stopColor="#d300c5"/>
          <stop offset="100%" stopColor="#7638fa"/>
        </radialGradient>
      </defs>
      <rect width="62" height="62" rx="15" fill="url(#ig)"/>
      <rect x="5" y="5" width="52" height="52" rx="12" fill="none" stroke="white" strokeWidth="3.5"/>
      <circle cx="31" cy="31" r="12" fill="none" stroke="white" strokeWidth="3.5"/>
      <circle cx="45" cy="17" r="3.2" fill="white"/>
    </svg>
  )
}

/* ─────────────────────────────────────
   Photo collage – exact copy of screenshot
───────────────────────────────────── */
function Collage() {
  return (
    <div style={{ position: 'relative', width: 420, height: 470, marginTop: 40, flexShrink: 0 }}>

      {/* ── back-left card (rotated -9deg) ── */}
      <div style={{
        position: 'absolute', left: 20, top: 88,
        width: 150, height: 240,
        borderRadius: 18,
        overflow: 'hidden',
        transform: 'rotate(-9deg)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
        border: '2px solid rgba(255,255,255,0.12)',
        zIndex: 2,
        background: '#1a1a1a',
      }}>
        <img src={P2} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
      </div>

      {/* ── main center card (straight) ── */}
      <div style={{
        position: 'absolute',
        left: '50%', transform: 'translateX(-50%)',
        top: 16,
        width: 198, height: 390,
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
        border: '2px solid rgba(255,255,255,0.15)',
        zIndex: 5,
        background: '#1a1a1a',
      }}>
        <img src={P1} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>

        {/* instagram bottom bar overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
          padding: '20px 14px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* white pill (home indicator) */}
          <div style={{
            flex: 1,
            height: 5, borderRadius: 10,
            background: 'rgba(255,255,255,0.7)',
            margin: '0 10px 0 0',
          }}/>
          {/* heart icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </div>
      </div>

      {/* ── back-right card (rotated +8deg) ── */}
      <div style={{
        position: 'absolute', right: 16, top: 64,
        width: 140, height: 220,
        borderRadius: 18,
        overflow: 'hidden',
        transform: 'rotate(8deg)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
        border: '2px solid rgba(255,255,255,0.12)',
        zIndex: 3,
        background: '#1a1a1a',
      }}>
        <img src={P3} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
      </div>

      {/* ── emoji badge (top, white pill) ── */}
      <div style={{
        position: 'absolute', top: 10, left: '50%', transform: 'translateX(-20%)',
        background: WHITE,
        borderRadius: 30,
        padding: '8px 16px',
        display: 'flex', alignItems: 'center', gap: 2,
        boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
        zIndex: 10, fontSize: 22,
      }}>
        🐻 🤩 🤗
      </div>

      {/* ── floating heart (left) ── */}
      <div style={{
        position: 'absolute', left: 8, bottom: 110,
        fontSize: 52,
        filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.6))',
        zIndex: 10,
        lineHeight: 1,
      }}>
        ❤️
      </div>

      {/* ── green star-check badge (right) ── */}
      <div style={{
        position: 'absolute', right: 10, bottom: 145,
        background: '#1fc858',
        borderRadius: 24,
        padding: '8px 14px',
        color: WHITE,
        fontSize: 14, fontWeight: 700,
        display: 'flex', alignItems: 'center', gap: 5,
        boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
        zIndex: 10,
      }}>
        <span style={{ color: '#ffd700', fontSize: 16 }}>★</span>
        <span>✓</span>
      </div>

      {/* ── story circle with photo (bottom-right) ── */}
      <div style={{
        position: 'absolute', right: 30, bottom: 50,
        width: 56, height: 56,
        borderRadius: '50%',
        background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
        padding: 3,
        boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
        zIndex: 10,
      }}>
        <div style={{ width:'100%', height:'100%', borderRadius:'50%', overflow:'hidden', border:'2px solid #000' }}>
          <img src={P4} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        </div>
      </div>

    </div>
  )
}

/* ─────────────────────────────────────
   Main login page
───────────────────────────────────── */
export default function LoginPage() {
  const { setToken } = useAuth()
  const navigate     = useNavigate()
  const qc           = useQueryClient()

  const [mode,     setMode]     = useState<'login'|'register'>('login')
  const [phone,    setPhone]    = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error,    setError]    = useState('')
  const [focused,  setFocused]  = useState<string|null>(null)

  const login = useMutation({
    mutationFn: () => authApi.login(phone, password),
    onSuccess: (r) => { qc.clear(); setToken(r.data.access_token); navigate('/feed') },
    onError:   ()  => setError('Неверный номер или пароль'),
  })
  const register = useMutation({
    mutationFn: () => authApi.register(username, phone, password),
    onSuccess: (r) => { qc.clear(); setToken(r.data.access_token); navigate('/feed') },
    onError:   ()  => setError('Ошибка регистрации. Попробуйте другой номер.'),
  })

  const submit  = (e: React.FormEvent) => { e.preventDefault(); setError(''); mode==='login' ? login.mutate() : register.mutate() }
  const pending = login.isPending || register.isPending
  const ready   = !!phone && !!password && (mode==='login' || !!username)

  const inputSx = (name: string): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box',
    background: '#1a1a1a',
    border: `1.5px solid ${focused===name ? BLUE : BORDER}`,
    borderRadius: 10,
    padding: '15px 16px',
    fontSize: 14, color: WHITE, outline: 'none',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  })

  const outlineBtn: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'transparent',
    border: `1.5px solid ${BORDER}`,
    borderRadius: 10,
    padding: '13px 16px',
    color: WHITE, fontSize: 15, fontWeight: 500,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    fontFamily: 'inherit',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: BG,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      color: WHITE,
    }}>

      {/* ─────── MAIN ROW ─────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'stretch',
      }}>

        {/* ════ LEFT PANEL ════ */}
        <div className="ig-left" style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 48px 48px 80px',
          position: 'relative',
        }}>
          {/* icon — top-left of left panel */}
          <div style={{ position: 'absolute', top: 32, left: 40 }}>
            <IgIcon />
          </div>

          {/* headline */}
          <h1 style={{
            fontSize: 38,
            fontWeight: 800,
            lineHeight: 1.25,
            textAlign: 'center',
            margin: 0,
            maxWidth: 440,
            letterSpacing: -0.3,
          }}>
            Посмотрите, какими моментами из жизни поделились ваши{' '}
            <span style={{
              background: 'linear-gradient(90deg,#f09433 0%,#e6683c 30%,#dc2743 55%,#cc2366 80%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>близкие<br/>друзья</span>.
          </h1>

          {/* collage */}
          <Collage />
        </div>

        {/* ════ DIVIDER ════ */}
        <div style={{ width: 1, background: '#1e1e1e', alignSelf: 'stretch' }} className="ig-divider"/>

        {/* ════ RIGHT PANEL ════ */}
        <div style={{
          width: 500,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 60px',
        }}>
          <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* title */}
            <p style={{ fontSize: 20, fontWeight: 400, margin: '0 0 4px', color: WHITE }}>
              Войти в Instagram
            </p>

            {/* form */}
            <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap: 10 }}>
              {mode==='register' && (
                <input value={username} onChange={e=>setUsername(e.target.value)}
                  onFocus={()=>setFocused('u')} onBlur={()=>setFocused(null)}
                  placeholder="Имя пользователя" required style={inputSx('u')}/>
              )}
              <input value={phone} onChange={e=>setPhone(e.target.value)}
                onFocus={()=>setFocused('p')} onBlur={()=>setFocused(null)}
                placeholder="Имя пользователя, номер мобильного телефона или электронный ад..."
                required style={inputSx('p')}/>
              <input value={password} onChange={e=>setPassword(e.target.value)}
                onFocus={()=>setFocused('pw')} onBlur={()=>setFocused(null)}
                placeholder="Пароль" type="password" required style={inputSx('pw')}/>

              {error && <p style={{ color:'#ed4956', fontSize:13, textAlign:'center', margin:0 }}>{error}</p>}

              <button type="submit" disabled={pending||!ready} style={{
                background: BLUE, color: WHITE, border:'none',
                borderRadius: 10, padding: '14px',
                fontWeight: 700, fontSize: 16, width: '100%',
                cursor: (pending||!ready) ? 'default' : 'pointer',
                opacity: (pending||!ready) ? 0.5 : 1,
                transition: 'opacity 0.2s',
                fontFamily: 'inherit', marginTop: 2,
              }}>
                {pending ? 'Загрузка...' : mode==='login' ? 'Войти' : 'Зарегистрироваться'}
              </button>
            </form>

            {mode==='login' && (<>

              {/* forgot password */}
              <p style={{ color: MUTED, fontSize:14, textAlign:'center', margin:'4px 0', cursor:'pointer' }}>
                Забыли пароль?
              </p>

              <div style={{ height: 16 }}/>

              {/* facebook button */}
              <button style={outlineBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877f2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Войти через Facebook
              </button>

              {/* create account button */}
              <button onClick={()=>{setMode('register');setError('')}} style={{
                ...outlineBtn,
                border: `1.5px solid ${BLUE}`,
                color: BLUE,
                fontWeight: 600,
              }}>
                Создать новый аккаунт
              </button>

              {/* meta */}
              <div style={{ textAlign:'center', marginTop: 14 }}>
                <span style={{ color: MUTED, fontSize: 15 }}>∞ Meta</span>
              </div>

            </>)}

            {mode==='register' && (
              <p style={{ textAlign:'center', fontSize:14, color: MUTED, margin:0 }}>
                Уже есть аккаунт?{' '}
                <button onClick={()=>{setMode('login');setError('')}}
                  style={{ color:BLUE, fontWeight:600, background:'none', border:'none', cursor:'pointer', fontSize:14, fontFamily:'inherit' }}>
                  Войти
                </button>
              </p>
            )}
          </div>
        </div>

      </div>

      {/* ─────── FOOTER ─────── */}
      <footer style={{ borderTop:'1px solid #1a1a1a', padding:'16px 24px 22px' }}>
        <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'5px 14px', marginBottom:10 }}>
          {['Meta','Информация','Блог','Вакансии','Помощь','API',
            'Конфиденциальность','Условия','Места','Популярное',
            'Instagram Lite','Meta AI','Threads','Загрузка контактов и лица, не являющихся пользователями','Meta Verified',
          ].map(l=>(
            <a key={l} href="#" onClick={e=>e.preventDefault()}
              style={{ color:MUTED, fontSize:12, textDecoration:'none' }}>{l}</a>
          ))}
        </div>
        <p style={{ color:MUTED, fontSize:12, textAlign:'center', margin:0 }}>
          Русский · © 2026 Instagram from Meta
        </p>
      </footer>

      <style>{`
        @media (max-width: 860px) {
          .ig-left   { display: none !important; }
          .ig-divider{ display: none !important; }
        }
        input::placeholder { color: #666 !important; }
        input { color-scheme: dark; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}
