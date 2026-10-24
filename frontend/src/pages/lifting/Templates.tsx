import { useEffect, useState } from 'react'
import { api } from '../../api'
import { daysLabel, targetLabel, type Template } from '../../lifting'
import TemplateEditor from './TemplateEditor'

function TemplateCard({
  template,
  onEdit,
  onChanged,
  onDeleted,
}: {
  template: Template
  onEdit: () => void
  onChanged: (t: Template) => void
  onDeleted: (id: number) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  async function toggle(enabled: boolean) {
    setError('')
    try {
      const { status, data } = await api<Template>(`/api/lifting/templates/${template.id}`, {
        method: 'PATCH',
        body: { enabled },
      })
      if (status === 200) onChanged(data)
      else setError("Couldn't update. Try again.")
    } catch {
      setError("Can't reach FitScape right now.")
    }
  }

  async function remove() {
    setError('')
    try {
      const { status } = await api(`/api/lifting/templates/${template.id}`, { method: 'DELETE' })
      if (status === 204 || status === 404) onDeleted(template.id)
      else setError("Couldn't delete. Try again.")
    } catch {
      setError("Can't reach FitScape right now.")
    }
  }

  return (
    <li className={template.enabled ? 'card template' : 'card template disabled'}>
      <header className="template-head">
        <div>
          <h3>{template.title}</h3>
          <p className="muted small">{daysLabel(template.weekdays)}</p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            role="switch"
            checked={template.enabled}
            onChange={(e) => toggle(e.target.checked)}
            aria-label={`${template.title} enabled`}
          />
          <span className="small muted">{template.enabled ? 'On' : 'Off'}</span>
        </label>
      </header>
      <ol className="template-exercises">
        {template.exercises.map((e, i) => (
          <li key={i}>
            <span>{e.name}</span>
            <span className="muted">{targetLabel(e)}</span>
          </li>
        ))}
      </ol>
      {error && (
        <p className="error small" role="alert">
          {error}
        </p>
      )}
      <div className="note-actions">
        {confirming ? (
          <>
            <button type="button" className="danger" onClick={remove}>
              Delete for good
            </button>
            <button type="button" className="ghost" onClick={() => setConfirming(false)}>
              Keep
            </button>
          </>
        ) : (
          <>
            <button type="button" className="ghost" onClick={onEdit}>
              Edit
            </button>
            <button type="button" className="ghost" onClick={() => setConfirming(true)}>
              Delete
            </button>
          </>
        )}
      </div>
    </li>
  )
}

/** Create, edit, switch on/off, and delete training templates. */
export default function Templates() {
  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [editing, setEditing] = useState<Template | 'new' | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<Template[]>('/api/lifting/templates')
      .then(({ status, data }) => {
        if (status === 200) setTemplates(data)
        else setError("Couldn't load your templates. Refresh to try again.")
      })
      .catch(() => setError("Can't reach FitScape right now. Refresh to try again."))
  }, [])

  const replace = (t: Template) =>
    setTemplates((prev) => {
      const others = (prev ?? []).filter((x) => x.id !== t.id)
      return [...others, t].sort((a, b) => a.title.localeCompare(b.title) || a.id - b.id)
    })

  if (editing) {
    return (
      <TemplateEditor
        initial={editing === 'new' ? undefined : editing}
        onSaved={(t) => {
          replace(t)
          setEditing(null)
        }}
        onCancel={() => setEditing(null)}
      />
    )
  }

  return (
    <section aria-labelledby="templates-title">
      <div className="section-head">
        <h2 id="templates-title">Templates</h2>
        <button type="button" onClick={() => setEditing('new')}>
          + New template
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {templates === null && !error && <p className="muted">Loading…</p>}
      {templates?.length === 0 && (
        <p className="empty muted">
          No templates yet. Build one for each kind of session (e.g. Push, Pull, Legs).
        </p>
      )}
      <ul className="templates">
        {templates?.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            onEdit={() => setEditing(t)}
            onChanged={replace}
            onDeleted={(id) => setTemplates((prev) => (prev ?? []).filter((x) => x.id !== id))}
          />
        ))}
      </ul>
    </section>
  )
}
