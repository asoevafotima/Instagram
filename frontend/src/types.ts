export interface UserShort {
  id: number
  username: string
  full_name?: string
  photo?: string
  is_private?: boolean
  is_online?: boolean
  last_seen_at?: string
}

export interface Media {
  id: number
  url: string
  type: 'image' | 'video'
  order: number
}

export interface Post {
  id: number
  user: UserShort
  caption?: string
  type?: string
  medias: Media[]
  likes_count: number
  comments_count: number
  is_liked: boolean
  is_saved: boolean
  created_at: string
}

export interface Story {
  id: number
  user: UserShort
  url: string
  type: 'image' | 'video'
  expires_at: string
  created_at: string
  views_count: number
  is_viewed: boolean
  has_unviewed: boolean
  is_liked: boolean
}

export interface StoryGroup {
  user: UserShort
  stories: Story[]
  has_unviewed: boolean
}

export interface Comment {
  id: number
  user: UserShort
  text: string
  created_at: string
  likes_count: number
  is_liked: boolean
  replies_count: number
  parent_id?: number | null
}

export interface ChatMember {
  id: number
  user: UserShort
  role: string
  joined_at: string
}

export interface Chat {
  id: number
  is_group: boolean
  name?: string
  photo?: string
  owner_id?: number
  owner?: UserShort
  companion?: UserShort
  members_count: number
  last_message?: string
  last_message_at?: string
  unread_count: number
  created_at: string
}

export interface Message {
  id: number
  chat_id: number
  user: UserShort
  text?: string
  media_url?: string
  reply_id?: number
  is_read: boolean
  created_at: string
}

export interface Highlight {
  id: number
  user: UserShort
  name: string
  cover?: string
  stories: { id: number; url: string; type: string; created_at: string }[]
  created_at: string
}

export interface Notification {
  id: number
  from_user: UserShort
  type: string
  entity_id?: number
  is_read: boolean
  created_at: string
}
