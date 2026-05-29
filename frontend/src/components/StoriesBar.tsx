import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { storiesApi, mediaUrl } from '../api'
import { useAuth } from '../store/auth'
import type { Story, StoryGroup } from '../types'
import StoryViewerModal from './StoryViewerModal'
import CreateStoryModal from './CreateStoryModal'

export default function StoriesBar() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [viewGroup, setViewGroup] = useState<StoryGroup | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  // Backend returns flat Story[] — group them by user on the frontend
  const { data: rawStories = [] } = useQuery({
    queryKey: ['stories-feed'],
    queryFn: async () => {
      const { data } = await storiesApi.getFeed()
      return data as Story[]
    },
    refetchInterval: 30_000,
  })

  const groups = useMemo<StoryGroup[]>(() => {
    const map = new Map<number, StoryGroup>()
    for (const story of rawStories) {
      const existing = map.get(story.user.id)
      if (existing) {
        existing.stories.push(story)
        if (story.has_unviewed) existing.has_unviewed = true
      } else {
        map.set(story.user.id, {
          user: story.user,
          stories: [story],
          has_unviewed: story.has_unviewed,
        })
      }
    }
    return Array.from(map.values())
  }, [rawStories])

  return (
    <>
      <div
        className="no-scroll"
        style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '0 4px 12px' }}
      >
        {/* Your story */}
        <button
          onClick={() => setCreateOpen(true)}
          style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', width: 76 }}
        >
          <div style={{ position: 'relative', width: 66, height: 66, margin: '0 auto 6px' }}>
            <div style={{ width: 66, height: 66, borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border)' }}>
              {user?.photo ? (
                <img src={mediaUrl(user.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontWeight: 700, fontSize: 20 }}>
                  {user?.username?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--blue)', border: '2px solid var(--bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Plus size={13} strokeWidth={3} color="#fff" />
            </div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text)', display: 'block', maxWidth: 76, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Ваша история
          </span>
        </button>

        {/* Story groups */}
        {groups.map(group => (
          <button
            key={group.user.id}
            onClick={() => setViewGroup(group)}
            style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', width: 76 }}
          >
            <div style={{ margin: '0 auto 6px', width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {group.has_unviewed ? (
                <div className="story-ring-gradient">
                  <div style={{ background: 'var(--bg)', borderRadius: '50%', padding: 2 }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', overflow: 'hidden' }}>
                      {group.user.photo
                        ? <img src={mediaUrl(group.user.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <div style={{ width: '100%', height: '100%', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontWeight: 700 }}>{group.user.username[0].toUpperCase()}</div>
                      }
                    </div>
                  </div>
                </div>
              ) : (
                <div className="story-ring-viewed">
                  <div style={{ width: 62, height: 62, borderRadius: '50%', overflow: 'hidden' }}>
                    {group.user.photo
                      ? <img src={mediaUrl(group.user.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : <div style={{ width: '100%', height: '100%', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontWeight: 700 }}>{group.user.username[0].toUpperCase()}</div>
                    }
                  </div>
                </div>
              )}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text)', display: 'block', maxWidth: 76, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {group.user.username}
            </span>
          </button>
        ))}
      </div>

      {viewGroup && (
        <StoryViewerModal
          group={viewGroup}
          onClose={() => {
            // Mark stories as viewed locally — don't refetch so they don't disappear
            qc.setQueryData<Story[]>(['stories-feed'], old =>
              old?.map(s =>
                s.user.id === viewGroup.user.id ? { ...s, has_unviewed: false } : s
              )
            )
            setViewGroup(null)
          }}
        />
      )}
      {createOpen && (
        <CreateStoryModal
          onClose={() => {
            setCreateOpen(false)
            qc.invalidateQueries({ queryKey: ['stories-feed'] })
          }}
        />
      )}
    </>
  )
}
