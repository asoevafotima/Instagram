import { useState, useRef } from 'react'
import { X, ImageIcon } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { storiesApi, uploadApi } from '../api'

interface Props {
  onClose: () => void
}

export default function CreateStoryModal({ onClose }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!file) return
      setUploading(true)
      const url = await uploadApi.upload(file)
      await storiesApi.create({ url, type: file.type.startsWith('video') ? 'video' : 'image' })
    },
    onSuccess: onClose,
    onSettled: () => setUploading(false),
  })

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
        width: 400, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>Добавить историю</span>
          <button onClick={onClose} style={{ color: 'var(--text)', display: 'flex', alignItems: 'center' }}>
            <X size={22} />
          </button>
        </div>

        {!preview ? (
          <div style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <ImageIcon size={60} color="var(--text2)" strokeWidth={1} />
            <p style={{ color: 'var(--text)', fontSize: 16 }}>Выберите фото или видео</p>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                background: 'var(--blue)', color: '#fff',
                borderRadius: 8, padding: '9px 20px', fontWeight: 600, cursor: 'pointer', border: 'none',
              }}
            >
              Выбрать файл
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={onFile} />
          </div>
        ) : (
          <>
            <div style={{ background: '#000', maxHeight: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {file?.type.startsWith('video') ? (
                <video src={preview} controls style={{ maxWidth: '100%', maxHeight: 420 }} />
              ) : (
                <img src={preview} alt="" style={{ maxWidth: '100%', maxHeight: 420, objectFit: 'contain' }} />
              )}
            </div>
            <div style={{ padding: 16, display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setFile(null); setPreview('') }}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8,
                  border: '1px solid var(--border)', color: 'var(--text)',
                  background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                }}
              >
                Назад
              </button>
              <button
                onClick={() => create.mutate()}
                disabled={uploading || create.isPending}
                style={{
                  flex: 1, background: 'var(--blue)', color: '#fff', borderRadius: 8,
                  padding: '10px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  opacity: uploading || create.isPending ? 0.7 : 1, border: 'none',
                }}
              >
                {uploading || create.isPending ? 'Публикация...' : 'Добавить историю'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
