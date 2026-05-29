import { Routes, Route, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from './store/auth'
import { authApi } from './api'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import FeedPage from './pages/FeedPage'
import ExplorePage from './pages/ExplorePage'
import ReelsPage from './pages/ReelsPage'
import MessagesPage from './pages/MessagesPage'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage from './pages/ProfilePage'
import ProfileEditPage from './pages/ProfileEditPage'
import SettingsPage from './pages/SettingsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, user, setUser } = useAuth()

  useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await authApi.me()
      setUser(data)
      return data
    },
    enabled: !!token && !user,
    retry: false,
  })

  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/feed" replace />} />
        <Route path="feed" element={<FeedPage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="reels" element={<ReelsPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile/edit" element={<ProfileEditPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile/:username" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/feed" replace />} />
      </Route>
    </Routes>
  )
}
