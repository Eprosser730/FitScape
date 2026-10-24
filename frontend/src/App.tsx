import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import Lifting from './pages/Lifting'
import Prayer from './pages/Prayer'
import Profile from './pages/Profile'
import SignIn from './pages/SignIn'

/** All routes, shared by the app and the tests. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/skills/prayer" element={<Prayer />} />
        <Route path="/skills/lifting" element={<Lifting />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
