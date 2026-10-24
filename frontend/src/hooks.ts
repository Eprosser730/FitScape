import { useOutletContext } from 'react-router'
import type { User } from './api'

/** The signed-in user, for any page rendered inside AppLayout. */
export function useUser() {
  return useOutletContext<User>()
}
