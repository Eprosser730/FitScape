import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { api, type User } from '../api'
import { SKILLS } from '../skills'


export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState('')
  const [logoutError, setLogoutError] = useState('')

  useEffect(() => {
    api<User>('/api/me')
      .then(({ status, data }) => {
        if (status === 200) setUser(data)
        else if (status === 401) navigate('/signin', { replace: true })
        else setError('Something went wrong loading your dashboard. Refresh to try again.')
      })
      .catch(() => setError("Can't reach FitScape right now. Refresh to try again."))
  }, [navigate])

  async function logOut() {
    setLogoutError('')
    try {
      const { status } = await api('/api/auth/logout', { method: 'POST' })
      if (status === 204) return navigate('/signin', { replace: true })
    } catch {
      // network failure: fall through and say so, the session may still be alive
    }
    setLogoutError("Couldn't log out. Try again.")
  }

  if (error) return <main><p className="error" role="alert">{error}</p></main>
  if (!user) return <main><p>Loading…</p></main>

  return (
    <main>
      <header>
        <h1>Welcome, {user.first_name}</h1>
        <button type="button" onClick={logOut}>Log out</button>
      </header>
      {logoutError && (
        <p className="error" role="alert">
          {logoutError}
        </p>
      )}
      <h2>Total level: {SKILLS.length}</h2>
      <ul className="skills">
        {SKILLS.map((skill) => (
          <li key={skill}>
            <h3>{skill}</h3>
            <p>Level 1 · Coming soon</p>
          </li>
        ))}
      </ul>
    </main>
  )
}
