import api from './client'

// ── Auth ──
export const authApi = {
  login: (phone: string, password: string) =>
    api.post('/auth/login', { phone, password }),
  register: (username: string, phone: string, password: string) =>
    api.post('/auth/register', { username, phone, password }),
  me: () => api.get('/users/me'),
}

// ── Posts ──
export const postsApi = {
  getFeed: (skip = 0, limit = 10) =>
    api.get('/posts/feed', { params: { skip, limit } }),
  getExplore: (skip = 0, limit = 20) =>
    api.get('/posts/explore', { params: { skip, limit } }),
  getUserPosts: (userId: number, skip = 0, limit = 30) =>
    api.get(`/posts/user/${userId}`, { params: { skip, limit } }),
  getPost: (id: number) => api.get(`/posts/${id}`),
  create: (data: { caption?: string; type?: string }) =>
    api.post('/posts/', { caption: data.caption ?? null, type: data.type ?? 'post' }),
  delete: (id: number) => api.delete(`/posts/${id}`),
}

// ── Medias ──
export const mediasApi = {
  addMedia: (postId: number, data: { url: string; type: string; order: number }) =>
    api.post(`/medias/post/${postId}`, data),
}

// ── Stories ──
export const storiesApi = {
  getFeed: () => api.get('/stories/feed'),
  getUserStories: (userId: number) => api.get(`/stories/user/${userId}`),
  create: (data: { url: string; type: string }) => api.post('/stories/', data),
  view: (storyId: number) => api.post(`/stories/${storyId}/view`),
  delete: (id: number) => api.delete(`/stories/${id}`),
  like: (storyId: number) => api.post(`/stories/${storyId}/react`, { emoji: '❤️' }),
  unlike: (storyId: number) => api.delete(`/stories/${storyId}/react`),
}

// ── Likes ── (backend: /likes/post/{post_id})
export const likesApi = {
  like: (postId: number) => api.post(`/likes/post/${postId}`),
  unlike: (postId: number) => api.delete(`/likes/post/${postId}`),
}

// ── Comments ── (backend: /comments/post/{post_id})
export const commentsApi = {
  getAll: (postId: number, skip = 0, limit = 50) =>
    api.get(`/comments/post/${postId}`, { params: { skip, limit } }),
  create: (postId: number, text: string, parentId?: number | null) =>
    api.post(`/comments/post/${postId}`, { text, parent_id: parentId ?? null }),
  delete: (commentId: number) => api.delete(`/comments/${commentId}`),
  getReplies: (commentId: number, skip = 0, limit = 20) =>
    api.get(`/comments/${commentId}/replies`, { params: { skip, limit } }),
  likeComment: (commentId: number) => api.post(`/comments/${commentId}/like`),
  unlikeComment: (commentId: number) => api.delete(`/comments/${commentId}/like`),
}

// ── Saved ──
export const savedApi = {
  save: (postId: number) => api.post(`/saved/${postId}`),
  unsave: (postId: number) => api.delete(`/saved/${postId}`),
  getSaved: (skip = 0, limit = 30) => api.get('/saved/', { params: { skip, limit } }),
}

// ── Follows ──
export const followsApi = {
  follow: (userId: number) => api.post(`/follows/${userId}`),
  unfollow: (userId: number) => api.delete(`/follows/${userId}`),
  getStatus: (userId: number) => api.get(`/follows/${userId}/status`),
  getCounts: (userId: number) => api.get(`/follows/${userId}/counts`),
  getFollowing: (userId: number, skip = 0, limit = 50) =>
    api.get(`/follows/${userId}/following`, { params: { skip, limit } }),
  getFollowers: (userId: number, skip = 0, limit = 50) =>
    api.get(`/follows/${userId}/followers`, { params: { skip, limit } }),
}

// ── Users ──
export const usersApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data: object) => api.put('/users/me', data),
  getByUsername: (username: string) => api.get(`/users/username/${username}`),
  search: (q: string) => api.get('/users/search', { params: { q } }),
  getSuggestions: (limit = 5) => api.get('/users/suggestions/list', { params: { limit } }),
}

// ── Chats ──
export const chatsApi = {
  getAll: () => api.get('/chats/'),
  getOne: (chatId: number) => api.get(`/chats/${chatId}`),
  create: (memberIds: number[], isGroup = false, name?: string, photo?: string) =>
    api.post('/chats/', { member_ids: memberIds, is_group: isGroup, name, photo }),
  update: (chatId: number, data: { name?: string; photo?: string }) =>
    api.put(`/chats/${chatId}`, data),
  getMessages: (chatId: number, skip = 0, limit = 50) =>
    api.get(`/chats/${chatId}/messages`, { params: { skip, limit } }),
  sendMessage: (chatId: number, text: string, mediaUrl?: string) =>
    api.post(`/messages/${chatId}`, { text, media_url: mediaUrl }),
  markAllRead: (chatId: number) =>
    api.post(`/messages/chat/${chatId}/read-all`),
  getMembers: (chatId: number) => api.get(`/chats/${chatId}/members`),
  addMember: (chatId: number, userId: number) =>
    api.post(`/chats/${chatId}/members/${userId}`),
  removeMember: (chatId: number, userId: number) =>
    api.delete(`/chats/${chatId}/members/${userId}`),
  updateMemberRole: (chatId: number, userId: number, role: string) =>
    api.put(`/chats/${chatId}/members/${userId}/role`, { role }),
}

// ── Notifications ──
export const notificationsApi = {
  getAll: (skip = 0, limit = 20) => api.get('/notifications/', { params: { skip, limit } }),
  getUnreadCount: () => api.get('/notifications/unread/count'),
  markAllRead: () => api.put('/notifications/read/all'),
}

// ── Blocks ──
export const blocksApi = {
  block: (userId: number) => api.post(`/blocks/${userId}`),
  unblock: (userId: number) => api.delete(`/blocks/${userId}`),
  getStatus: (userId: number) => api.get(`/blocks/${userId}/status`),
}

// ── Highlights ──
export const highlightsApi = {
  getUserHighlights: (userId: number) => api.get(`/highlights/user/${userId}`),
  create: (name: string, cover?: string) => api.post('/highlights/', { name, cover: cover ?? null }),
  update: (id: number, name?: string, cover?: string) => api.put(`/highlights/${id}`, { name, cover }),
  delete: (id: number) => api.delete(`/highlights/${id}`),
  addStory: (highlightId: number, storyId: number) => api.post(`/highlights/${highlightId}/stories/${storyId}`),
  removeStory: (highlightId: number, storyId: number) => api.delete(`/highlights/${highlightId}/stories/${storyId}`),
}

// ── Tags ──
export const tagsApi = {
  getPopular: (limit = 20) => api.get('/tags/popular', { params: { limit } }),
  search: (q: string) => api.get('/tags/search', { params: { q } }),
  getTagPosts: (tagName: string, skip = 0, limit = 20) =>
    api.get(`/tags/${tagName}/posts`, { params: { skip, limit } }),
}

// ── Upload ── (backend prefix is /upload, not /uploads)
export const uploadApi = {
  upload: async (file: File): Promise<string> => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post('/upload/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.url
  },
}

export const mediaUrl = (url?: string) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `http://localhost:8000${url.startsWith('/') ? '' : '/'}${url}`
}

export const formatTime = (iso: string) => {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return `${diff} с.`
  if (diff < 3600) return `${Math.floor(diff / 60)} мин.`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч.`
  if (diff < 604800) return `${Math.floor(diff / 86400)} д.`
  return d.toLocaleDateString('ru')
}
