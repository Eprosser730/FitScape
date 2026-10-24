import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { api } from '../api'

type LoginError = { code?: string; attempts_left?: number; locked_until?: string }

function lockedMessage(lockedUntil?: string) {
  const time = lockedUntil
    ? new Date(lockedUntil).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : 'later'
  return `Too many wrong PINs. Try again at ${time}.`
}

export default function SignIn() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (mode === 'signup' && pin !== confirmPin) {
      setError("PINs don't match.")
      return
    }
    setBusy(true)
    try {
      if (mode === 'signin') await signIn()
      else await signUp()
    } catch {
      setError("Can't reach FitScape right now. Try again in a moment.")
    } finally {
      setBusy(false)
    }
  }

  async function signIn() {
    const { status, data } = await api<LoginError>('/api/auth/login', { body: { username, pin } })
    if (status === 200) return navigate('/')
    if (status === 404) {
      setMode('signup')
      setPin('')
      return
    }
    if (status === 401) {
      const left = data.attempts_left ?? 0
      return setError(`Wrong PIN. ${left} ${left === 1 ? 'attempt' : 'attempts'} left.`)
    }
    if (status === 423) return setError(lockedMessage(data.locked_until))
    if (status === 422) return setError('Usernames are 3–20 letters, numbers or _. PINs are 4 digits.')
    setError('Something went wrong. Try again.')
  }

  async function signUp() {
    const body = { username, first_name: firstName, last_name: lastName, pin }
    const { status } = await api('/api/auth/signup', { body })
    if (status === 201) return navigate('/')
    if (status === 409) return setError('That username was just taken. Pick another.')
    if (status === 422) return setError('Check your details. Very easy PINs like 1234 are not allowed.')
    setError('Something went wrong. Try again.')
  }

  function backToSignIn() {
    setMode('signin')
    setError('')
    setPin('')
    setConfirmPin('')
  }

  const pinProps = {
    type: 'password',
    inputMode: 'numeric' as const,
    pattern: '[0-9]{4}',
    maxLength: 4,
    required: true,
    autoComplete: mode === 'signin' ? 'current-password' : 'new-password',
  }

  return (
    <main>
      <h1>FitScape</h1>
      <form onSubmit={submit} aria-describedby={error ? 'form-error' : undefined}>
        {mode === 'signup' && (
          <p className="notice" role="status">
            No account named <strong>{username}</strong>. Create one?
          </p>
        )}
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            autoFocus
          />
        </label>
        {mode === 'signup' && (
          <>
            <label>
              First name
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoFocus />
            </label>
            <label>
              Last name
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </label>
          </>
        )}
        <label>
          {mode === 'signup' ? 'Choose a 4-digit PIN' : 'PIN'}
          <input {...pinProps} value={pin} onChange={(e) => setPin(e.target.value)} />
        </label>
        {mode === 'signup' && (
          <label>
            Confirm PIN
            <input {...pinProps} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} />
          </label>
        )}
        {error && (
          <p id="form-error" className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
        {mode === 'signup' && (
          <button type="button" onClick={backToSignIn}>
            Back to sign in
          </button>
        )}
      </form>
    </main>
  )
}
