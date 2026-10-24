import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api'
import SkillHeader from '../components/SkillHeader'
import { formatDay, todayIso } from '../dates'
import { SKILLS } from '../skills'

type Note = { id: number; read_on: string; passage: string; summary: string }

const PRAYER = SKILLS.find((s) => s.osrs === 'Prayer')!

function NoteCard({ note, onDelete }: { note: Note; onDelete: (id: number) => void }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <li>
      <details className="note">
        <summary>
          <span className="note-meta">
            <time dateTime={note.read_on}>{formatDay(note.read_on)}</time>
            <strong>{note.passage}</strong>
          </span>
          <span className="note-preview muted">{note.summary}</span>
        </summary>
        <div className="note-body">
          <p>{note.summary}</p>
          <div className="note-actions">
            {confirming ? (
              <>
                <button type="button" className="danger" onClick={() => onDelete(note.id)}>
                  Delete for good
                </button>
                <button type="button" className="ghost" onClick={() => setConfirming(false)}>
                  Keep
                </button>
              </>
            ) : (
              <button type="button" className="ghost" onClick={() => setConfirming(true)}>
                Delete
              </button>
            )}
          </div>
        </div>
      </details>
    </li>
  )
}

export default function Prayer() {
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [readOn, setReadOn] = useState(todayIso)
  const [passage, setPassage] = useState('')
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<Note[]>('/api/prayer/notes')
      .then(({ status, data }) => {
        if (status === 200) setNotes(data)
        else setError('Could not load your notes. Refresh to try again.')
      })
      .catch(() => setError('Cannot reach FitScape right now. Refresh to try again.'))
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const body = { read_on: readOn, passage, summary }
      const { status, data } = await api<Note>('/api/prayer/notes', { body })
      if (status === 201) {
        // Newest day first, same order the server uses.
        setNotes((prev) =>
          [data, ...(prev ?? [])].sort((a, b) => b.read_on.localeCompare(a.read_on) || b.id - a.id),
        )
        setPassage('')
        setSummary('')
      } else setError('Add a passage and a summary (passage up to 120 characters).')
    } catch {
      setError('Cannot reach FitScape right now. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: number) {
    setError('')
    try {
      const { status } = await api(`/api/prayer/notes/${id}`, { method: 'DELETE' })
      if (status === 204 || status === 404) setNotes((prev) => (prev ?? []).filter((n) => n.id !== id))
      else setError('Could not delete that note. Try again.')
    } catch {
      setError('Cannot reach FitScape right now. Try again in a moment.')
    }
  }

  const count = notes?.length ?? 0
  return (
    <>
      <SkillHeader skill={PRAYER}>
        {count} {count === 1 ? 'entry' : 'entries'}
      </SkillHeader>
      <div className="journal">
        <form className="card" onSubmit={submit} aria-labelledby="new-entry">
          <h2 id="new-entry">New entry</h2>
          <div className="inline-fields">
            <label>
              Date
              <input type="date" value={readOn} max={todayIso()} onChange={(e) => setReadOn(e.target.value)} required />
            </label>
            <label>
              Passage
              <input
                value={passage}
                onChange={(e) => setPassage(e.target.value)}
                placeholder="e.g. John 3:1-21"
                maxLength={120}
                required
              />
            </label>
          </div>
          <label>
            What did you read or pray about?
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="A few lines in your own words…"
              maxLength={10000}
              rows={6}
              required
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save entry'}
            </button>
          </div>
        </form>
        <section aria-labelledby="previous-notes">
          <h2 id="previous-notes" className="section-title">
            Previous notes
          </h2>
          {notes === null && !error && <p className="muted">Loading…</p>}
          {notes?.length === 0 && (
            <p className="empty muted">No entries yet. Your first one will show up here.</p>
          )}
          <ul className="notes">
            {notes?.map((note) => (
              <NoteCard key={note.id} note={note} onDelete={remove} />
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
