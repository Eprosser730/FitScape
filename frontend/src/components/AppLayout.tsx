import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { api, type User } from '../api'

/** Signed-in pages: checks the session once, then renders the header and the page. */
export default function AppLayout() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState('')
  const [logoutError, setLogoutError] = useState('')

  useEffect(() => {
    api<User>('/api/me')
      .then(({ status, data }) => {
        if (status === 200) setUser(data)
        else if (status === 401) navigate('/signin', { replace: true })
        else setError('Something went wrong loading FitScape. Refresh to try again.')
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

  if (error) {
    return (
      <main>
        <p className="error" role="alert">{error}</p>
      </main>
    )
  }
  if (!user) {
    return (
      <main>
        <p className="muted">Loading…</p>
      </main>
    )
  }

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          <img src="/icons/stats.png" alt="" className="pixel" />
          FitScape
        </Link>
        <nav aria-label="Main">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>
        <div className="topbar-user">
          <span className="muted">{user.first_name}</span>
          <button type="button" className="ghost" onClick={logOut}>
            Log out
          </button>
        </div>
      </header>
      <main>
        {logoutError && (
          <p className="error" role="alert">
            {logoutError}
          </p>
        )}
        <Outlet context={user} />
      </main>
      <Footer />
    </>
  )
}

export function Footer() {
  return (
    <footer className="footer muted">
      Fan project. RuneScape and its skill icons are © Jagex Ltd; icons via the OSRS Wiki.
    </footer>
  )
}
