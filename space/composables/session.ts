import { UserSession } from '../server/utils/session'

const useSessionState = () => useState<UserSession>('nuxt-session', () => ({}))

export const useUserSession = () => {
  const sessionState = useSessionState()
  return {
    loggedIn: computed(() => Boolean(sessionState.value.user)),
    user: computed(() => sessionState.value.user || null),
    session: sessionState,
    fetch,
    clear
  }
}

async function fetch() {
  useSessionState().value = await useRequestFetch()('/api/session').catch(() => ({}))
}

async function clear() {
  await $fetch('/api/session', { method: 'DELETE' })
  useSessionState().value = {}
}
