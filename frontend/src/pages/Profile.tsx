import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { api } from '../api'

export type ProfileData = {
  gender: string
  age: number
  height_ft: number
  height_in: number
  weight_lb: string
  bmi: number
  bmi_category: string
}

const GENDERS = [
  ['male', 'Male'],
  ['female', 'Female'],
  ['other', 'Other'],
  ['prefer_not_to_say', 'Prefer not to say'],
] as const

// The BMI scale bar spans 15 to 40; categories per the CDC.
const SCALE_MIN = 15
const SCALE_MAX = 40

function BmiCard({ profile }: { profile: ProfileData }) {
  const pct = Math.min(100, Math.max(0, ((profile.bmi - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100))
  return (
    <section className="card bmi" aria-labelledby="bmi-title">
      <h2 id="bmi-title" className="section-title">Body mass index</h2>
      <p className="bmi-value">
        <strong>{profile.bmi.toFixed(1)}</strong>
        <span>{profile.bmi_category}</span>
      </p>
      <div className="bmi-scale" aria-hidden="true">
        <span className="bmi-marker" style={{ left: `${pct}%` }} />
      </div>
      <p className="bmi-legend muted" aria-hidden="true">
        <span>Under</span>
        <span>Healthy</span>
        <span>Over</span>
        <span>Obesity</span>
      </p>
      <p className="muted small">
        BMI is a rough screening number from height and weight; it does not see muscle.
      </p>
    </section>
  )
}

export default function Profile() {
  const [params] = useSearchParams()
  const isWelcome = params.has('welcome')
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [form, setForm] = useState({ gender: '', age: '', height_ft: '', height_in: '', weight_lb: '' })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<ProfileData>('/api/profile')
      .then(({ status, data }) => {
        if (status === 200) {
          setProfile(data)
          setForm({
            gender: data.gender,
            age: String(data.age),
            height_ft: String(data.height_ft),
            height_in: String(data.height_in),
            weight_lb: String(data.weight_lb),
          })
        } else if (status !== 404) setError('Could not load your profile. Refresh to try again.')
      })
      .catch(() => setError('Cannot reach FitScape right now. Refresh to try again.'))
      .finally(() => setLoaded(true))
  }, [])

  function set(field: keyof typeof form) {
    return (e: { target: { value: string } }) => {
      setSaved(false)
      setForm((f) => ({ ...f, [field]: e.target.value }))
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const body = {
        gender: form.gender,
        age: Number(form.age),
        height_ft: Number(form.height_ft),
        height_in: Number(form.height_in || 0),
        weight_lb: Number(form.weight_lb),
      }
      const { status, data } = await api<ProfileData>('/api/profile', { method: 'PUT', body })
      if (status === 200) {
        setProfile(data)
        setSaved(true)
      } else if (status === 422) setError('Check the values: age 13 to 120, height 3 to 8 ft, weight 50 to 1000 lb.')
      else setError('Something went wrong. Try again.')
    } catch {
      setError('Cannot reach FitScape right now. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) return <p className="muted">Loading…</p>

  return (
    <div className="profile-page">
      <header className="page-header">
        <h1>{isWelcome && !profile ? 'Tell us about you' : 'Your profile'}</h1>
        <p className="muted">Used to work out your BMI. Only you can see it.</p>
      </header>
      <div className="profile-grid">
        <form className="card" onSubmit={submit} aria-describedby={error ? 'profile-error' : undefined}>
          <label>
            Gender
            <select value={form.gender} onChange={set('gender')} required>
              <option value="" disabled>
                Choose…
              </option>
              {GENDERS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Age
            <input type="number" inputMode="numeric" min={13} max={120} value={form.age} onChange={set('age')} required />
          </label>
          <fieldset className="inline-fields">
            <legend>Height</legend>
            <label>
              Feet
              <input type="number" inputMode="numeric" min={3} max={8} value={form.height_ft} onChange={set('height_ft')} required />
            </label>
            <label>
              Inches
              <input type="number" inputMode="numeric" min={0} max={11} value={form.height_in} onChange={set('height_in')} />
            </label>
          </fieldset>
          <label>
            Weight (lb)
            <input type="number" inputMode="decimal" min={50} max={1000} step={0.1} value={form.weight_lb} onChange={set('weight_lb')} required />
          </label>
          {error && (
            <p id="profile-error" className="error" role="alert">
              {error}
            </p>
          )}
          {saved && (
            <p className="success" role="status">
              Saved.
            </p>
          )}
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save profile'}
            </button>
            {isWelcome && <Link to="/">{profile ? 'Go to dashboard' : 'Skip for now'}</Link>}
          </div>
        </form>
        {profile && <BmiCard profile={profile} />}
      </div>
    </div>
  )
}
