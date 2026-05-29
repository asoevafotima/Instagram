import { useState } from 'react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { postsApi, followsApi, chatsApi, usersApi, mediaUrl } from '../api'
import type { UserShort as UserShortType } from '../types'
import { useAuth } from '../store/auth'
import StoriesBar from '../components/StoriesBar'
import PostCard from '../components/PostCard'
import type { Post, Chat } from '../types'

export default function FeedPage() {
  const { user } = useAuth()

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const { data } = await postsApi.getFeed(pageParam, 10)
      return data as Post[]
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.length < 10) return undefined
      return (lastPageParam as number) + lastPage.length
    },
    refetchInterval: 30_000,
  })

  const posts = data?.pages.flat() ?? []

  return (
    <div className="feed-wrap">
      {/* Feed column */}
      <div className="feed-col">
        <StoriesBar />
        <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0 20px' }} />

        {isLoading ? (
          Array.from({ length: 3 }, (_, i) => <SkeletonPost key={i} />)
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text2)' }}>
            <p style={{ fontSize: 18, marginBottom: 8 }}>Нет публикаций</p>
            <p style={{ fontSize: 14 }}>Подпишитесь на кого-нибудь, чтобы видеть их посты!</p>
          </div>
        ) : (
          posts.map(post => <PostCard key={post.id} post={post} />)
        )}

        {hasNextPage && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              style={{
                background: 'none', border: '1px solid var(--border)',
                borderRadius: 8, padding: '9px 24px',
                color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {isFetchingNextPage ? 'Загрузка...' : 'Загрузить ещё'}
            </button>
          </div>
        )}
      </div>

      {/* Right column */}
      <div className="feed-right">
        <RightColumn user={user} />
      </div>
    </div>
  )
}

function SkeletonPost() {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
        <div className="skeleton" style={{ width: 140, height: 13, borderRadius: 4 }} />
      </div>
      <div className="skeleton" style={{ width: '100%', paddingBottom: '80%', borderRadius: 4 }} />
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton" style={{ width: 100, height: 12, borderRadius: 4 }} />
        <div className="skeleton" style={{ width: '70%', height: 12, borderRadius: 4 }} />
      </div>
    </div>
  )
}

interface RightColumnProps {
  user: { id: number; username: string; full_name?: string; photo?: string } | null
}

function RightColumn({ user }: RightColumnProps) {
  const navigate = useNavigate()

  const { data: suggestions = [] } = useQuery({
    queryKey: ['suggestions', user?.id],
    queryFn: async () => {
      const { data } = await usersApi.getSuggestions(5)
      return (data as UserShortType[]).map(u => ({ ...u, mutualCount: 0 }))
    },
    enabled: !!user,
  })

  const { data: chats = [] } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const { data } = await chatsApi.getAll()
      return data as Chat[]
    },
    refetchInterval: 30_000,
  })

  const totalUnread = chats.reduce((s, c) => s + (c.unread_count ?? 0), 0)
  const recentAvatars = chats.slice(0, 2).map(c => ({
    photo: c.is_group ? c.photo : c.companion?.photo,
    name: c.is_group ? c.name : c.companion?.username,
  }))

  return (
    <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 52px)' }}>
      {/* Current user */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, marginTop: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
            {user.photo
              ? <img src={mediaUrl(user.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--text2)', fontSize: 16 }}>{user.username[0].toUpperCase()}</div>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.username}
            </p>
            {user.full_name && (
              <p style={{ color: 'var(--text2)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.full_name}
              </p>
            )}
          </div>
          <button style={{ color: 'var(--blue)', fontWeight: 600, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            Переключиться
          </button>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ color: 'var(--text2)', fontWeight: 600, fontSize: 14 }}>Рекомендации для вас</span>
            <button style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Все
            </button>
          </div>
          {suggestions.map(u => <SuggestedUser key={u.id} suggestedUser={u} />)}
        </>
      )}

      {/* Footer */}
      <p style={{ color: 'var(--text2)', fontSize: 11, marginTop: 24, lineHeight: 2 }}>
        О нас · Справка · Пресса · API · Вакансии<br />
        Конфиденциальность · Условия · Язык<br /><br />
        © 2025 INSTAGRAM ОТ META
      </p>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Messages pill — pinned to bottom */}
      <button
        onClick={() => navigate('/messages')}
        style={{
          marginBottom: 24,
          height: 62,
          paddingLeft: 18,
          paddingRight: 22,
          borderRadius: 31,
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          color: 'var(--text)',
          width: 'fit-content',
        }}
      >
        {/* Chat icon with badge */}
        <div style={{ position: 'relative', flexShrink: 0, display: 'flex' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="24" height="24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {totalUnread > 0 && (
            <span style={{
              position: 'absolute', top: -6, right: -6,
              background: '#ed4956', color: '#fff',
              fontSize: 10, fontWeight: 700, borderRadius: 9999,
              minWidth: 17, height: 17, display: 'flex',
              alignItems: 'center', justifyContent: 'center', padding: '0 3px',
            }}>
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </div>

        <span style={{ fontWeight: 600, fontSize: 16, whiteSpace: 'nowrap' }}>Сообщения</span>

        {/* Recent avatars */}
        {recentAvatars.length > 0 && (
          <div style={{ display: 'flex', marginLeft: 4 }}>
            {recentAvatars.map((a, i) => (
              <div
                key={i}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  overflow: 'hidden', background: 'var(--border)',
                  border: '2px solid var(--bg3)',
                  marginLeft: i > 0 ? -10 : 0, flexShrink: 0,
                }}
              >
                {a.photo ? (
                  <img src={mediaUrl(a.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text2)' }}>
                    {a.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </button>
    </div>
  )
}

function SuggestedUser({ suggestedUser }: { suggestedUser: UserShortType & { mutualCount?: number } }) {
  const qc = useQueryClient()
  const [optimisticFollow, setOptimisticFollow] = useState<boolean | null>(null)

  const { data: followStatus } = useQuery({
    queryKey: ['follow-status', suggestedUser.id],
    queryFn: async () => {
      const { data } = await followsApi.getStatus(suggestedUser.id)
      return data as { status: 'accepted' | 'pending' | 'none' }
    },
    staleTime: 30_000,
  })

  const isFollowing = optimisticFollow !== null
    ? optimisticFollow
    : followStatus?.status === 'accepted' || followStatus?.status === 'pending'

  const isPending = optimisticFollow === null && followStatus?.status === 'pending'

  function handleFollow() {
    const was = isFollowing
    setOptimisticFollow(!was)
    const call = was ? followsApi.unfollow : followsApi.follow
    call(suggestedUser.id)
      .then(() => {
        qc.invalidateQueries({ queryKey: ['follow-status', suggestedUser.id] })
        qc.invalidateQueries({ queryKey: ['feed'] })
        qc.invalidateQueries({ queryKey: ['stories-feed'] })
      })
      .catch(() => setOptimisticFollow(was))
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
        {suggestedUser.photo
          ? <img src={mediaUrl(suggestedUser.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--text2)', fontSize: 12 }}>{suggestedUser.username[0].toUpperCase()}</div>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {suggestedUser.username}
        </p>
        <p style={{ color: 'var(--text2)', fontSize: 12 }}>
          {suggestedUser.mutualCount ? `${suggestedUser.mutualCount} общих друга` : 'Возможно, вы знакомы'}
        </p>
      </div>
      <button
        onClick={handleFollow}
        style={{
          color: isFollowing ? 'var(--text2)' : 'var(--blue)',
          fontWeight: 600, fontSize: 13,
          background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
        }}
      >
        {isFollowing ? (isPending ? 'Запрос отправлен' : 'Отписаться') : 'Подписаться'}
      </button>
    </div>
  )
}
