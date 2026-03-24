import { useState } from 'react'
import { ColorPicker } from '../../components/ColorPicker'
import { useTagStore } from '../../store/tagStore'
import { useToast } from '../../components/ToastProvider'
import type { Tag } from '../../types'

interface TagEditModalProps {
  tag: Tag
  onClose: () => void
}

export function TagEditModal({ tag, onClose }: TagEditModalProps) {
  const [name, setName] = useState(tag.name)
  const [color, setColor] = useState(tag.color)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const { updateTag, deleteTag } = useTagStore()
  const { showToast } = useToast()

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await updateTag(tag.id, { name: name.trim(), color })
      onClose()
    } catch {
      showToast('Failed to save tag. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmDelete() {
    setSaving(true)
    try {
      await deleteTag(tag.id)
      onClose()
    } catch {
      showToast('Failed to delete tag. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit tag"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--color-bg)', border: '1px solid var(--color-border)',
        borderRadius: 8, padding: 20, width: 300, display: 'flex',
        flexDirection: 'column', gap: 14,
      }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Edit Tag</div>

        <div>
          <label
            htmlFor="tag-name-input"
            style={{ fontSize: 11, color: 'var(--color-text-muted)',
              textTransform: 'uppercase', display: 'block', marginBottom: 4 }}
          >
            Tag Name
          </label>
          <input
            id="tag-name-input"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 6, color: 'var(--color-text)', padding: '6px 8px',
              fontSize: 13, outline: 'none',
            }}
          />
        </div>

        <div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)',
            textTransform: 'uppercase', marginBottom: 4 }}>
            Color
          </div>
          <ColorPicker selected={color} onSelect={setColor} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid var(--color-border)',
              borderRadius: 6, color: 'var(--color-text)', padding: '6px 14px',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            style={{
              background: 'var(--color-accent)', border: 'none',
              borderRadius: 6, color: '#fff', padding: '6px 14px',
              fontSize: 13, cursor: 'pointer', opacity: !name.trim() || saving ? 0.5 : 1,
            }}
          >
            Save
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              style={{
                background: 'none', border: 'none', color: 'var(--color-danger, #ef4444)',
                fontSize: 13, cursor: 'pointer', padding: 0,
              }}
            >
              Delete
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Delete this tag?
              </span>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={saving}
                style={{
                  background: 'var(--color-danger, #ef4444)', border: 'none',
                  borderRadius: 6, color: '#fff', padding: '4px 10px',
                  fontSize: 12, cursor: 'pointer',
                }}
              >
                Confirm delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                style={{
                  background: 'none', border: 'none', color: 'var(--color-text-muted)',
                  fontSize: 12, cursor: 'pointer', padding: 0,
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
