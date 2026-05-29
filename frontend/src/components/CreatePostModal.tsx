import { useState, useRef } from 'react'
import { X, ImageIcon } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postsApi, mediasApi, uploadApi } from '../api'

interface Props {
  onClose: () => void
}

export default function CreatePostModal({ onClose }: Props) {
  const qc = useQueryClient()
  const [caption, setCaption] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [previewIdx, setPreviewIdx] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    if (!picked.length) return
    setFiles(picked)
    setPreviews(picked.map(f => URL.createObjectURL(f)))
    setPreviewIdx(0)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const picked = Array.from(e.dataTransfer.files)
    if (!picked.length) return
    setFiles(picked)
    setPreviews(picked.map(f => URL.createObjectURL(f)))
    setPreviewIdx(0)
  }

  const createPost = useMutation({
    mutationFn: async () => {
      setError('')
      setUploading(true)
      // Step 1: Create post
      const type = files.some(f => f.type.startsWith('video')) ? 'video' : 'image'
      const { data: post } = await postsApi.create({
        caption: caption.trim() || undefined,
        type,
      })
      // Step 2: Upload each file and attach media
      for (let i = 0; i < files.length; i++) {
        const url = await uploadApi.upload(files[i])
        await mediasApi.addMedia(post.id, {
          url,
          type: files[i].type.startsWith('video') ? 'video' : 'image',
          order: i,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] })
      onClose()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? 'Ошибка публикации'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
    onSettled: () => setUploading(false),
  })

  const busy = uploading || createPost.isPending

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        background: 'var(--bg3)', borderRadius: 12,
        width: previews.length ? 900 : 420,
        maxWidth: '95vw', maxHeight: '90vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>Создание публикации</span>
          <button onClick={onClose} style={{ color: 'var(--text)', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        {previews.length === 0 ? (
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: 48, gap: 20, minHeight: 380,
            }}
          >
            <ImageIcon size={72} strokeWidth={1} color="var(--text2)" />
            <p style={{ fontSize: 22, color: 'var(--text)', fontWeight: 300 }}>
              Перетащите фото и видео сюда
            </p>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                background: 'var(--blue)', color: '#fff', borderRadius: 8,
                padding: '9px 18px', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', border: 'none',
              }}
            >
              Выбрать с компьютера
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4" multiple hidden onChange={onFile} />
          </div>
        ) : (
          <div style={{ display: 'flex', flex: 1, minHeight: 0, maxHeight: 600 }}>
            {/* Preview */}
            <div style={{ flex: 1, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              {files[previewIdx]?.type.startsWith('video') ? (
                <video src={previews[previewIdx]} controls style={{ maxWidth: '100%', maxHeight: '100%' }} />
              ) : (
                <img src={previews[previewIdx]} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              )}
              {previews.length > 1 && (
                <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
                  {previews.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPreviewIdx(i)}
                      style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: i === previewIdx ? '#fff' : 'rgba(255,255,255,0.5)',
                        border: 'none', cursor: 'pointer', padding: 0,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Caption panel */}
            <div style={{
              width: 340, borderLeft: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', padding: 16, gap: 12,
            }}>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Добавьте подпись..."
                maxLength={2200}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: 'var(--text)', resize: 'none', fontSize: 14,
                  lineHeight: 1.5, minHeight: 140, fontFamily: 'inherit',
                }}
              />
              <span style={{ color: 'var(--text2)', fontSize: 12, textAlign: 'right' }}>
                {caption.length}/2200
              </span>
              {error && (
                <p style={{ color: '#ed4956', fontSize: 13 }}>{error}</p>
              )}
              <button
                onClick={() => !busy && createPost.mutate()}
                style={{
                  background: busy ? 'rgba(0,149,246,0.5)' : 'var(--blue)',
                  color: '#fff', borderRadius: 8, padding: '10px',
                  fontWeight: 600, fontSize: 14,
                  cursor: busy ? 'default' : 'pointer', border: 'none',
                }}
              >
                {busy ? 'Публикация...' : 'Поделиться'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
