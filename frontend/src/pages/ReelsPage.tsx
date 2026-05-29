import { useQuery } from '@tanstack/react-query'
import { postsApi } from '../api'
import type { Post } from '../types'
import ReelsViewer from '../components/ReelsViewer'

export default function ReelsPage() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['explore'],
    queryFn: async () => {
      const { data } = await postsApi.getExplore(0, 60)
      return data as Post[]
    },
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', color: 'var(--text2)', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 20, fontWeight: 600 }}>Нет публикаций</p>
        <p style={{ fontSize: 14 }}>Подпишитесь на кого-нибудь, чтобы увидеть их публикации</p>
      </div>
    )
  }

  return <ReelsViewer posts={posts} />
}
