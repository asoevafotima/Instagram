import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import CreatePostModal from './CreatePostModal'
import SearchPanel from './SearchPanel'
import NotificationsPanel from './NotificationsPanel'

export default function Layout() {
  const [showCreate, setShowCreate] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    document.body.classList.toggle('search-open', searchOpen || notifOpen)
    return () => document.body.classList.remove('search-open')
  }, [searchOpen, notifOpen])

  useEffect(() => {
    setSearchOpen(false)
    setNotifOpen(false)
  }, [location.pathname])

  function handleSearchToggle() {
    setNotifOpen(false)
    setSearchOpen(o => !o)
  }

  function handleNotifToggle() {
    setSearchOpen(false)
    setNotifOpen(o => !o)
  }

  return (
    <>
      <Navbar
        onCreatePost={() => setShowCreate(true)}
        searchOpen={searchOpen}
        onSearchToggle={handleSearchToggle}
        notifOpen={notifOpen}
        onNotifToggle={handleNotifToggle}
      />
      {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} />}
      {notifOpen && <NotificationsPanel onClose={() => setNotifOpen(false)} />}
      <main className="main-content">
        <Outlet />
      </main>
      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
    </>
  )
}
