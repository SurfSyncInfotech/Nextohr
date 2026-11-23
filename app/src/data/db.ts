// Tiny reactive store. The mock "database" lives in memory and is mirrored to
// localStorage so the demo survives reloads. Swap ./api.ts for real HTTP calls
// when the backend is ready — UI code only talks to the api module and useDb.
import { useMemo, useSyncExternalStore } from 'react'
import type { DB } from './types'
import { DB_VERSION, seed } from './seed'

const KEY = 'ss-hrms-db'

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DB
      if (parsed.version === DB_VERSION) return parsed
    }
  } catch {
    /* storage unavailable or corrupt — fall back to fresh seed */
  }
  return seed()
}

let state: DB = load()
const listeners = new Set<() => void>()
let saveTimer: ReturnType<typeof setTimeout> | undefined

function persist() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* quota or private mode */ }
  }, 150)
}

export const getDb = () => state

/** Apply a mutation to a draft copy, then publish it. */
export function mutate(fn: (draft: DB) => void) {
  const draft = structuredClone(state)
  fn(draft)
  state = draft
  persist()
  listeners.forEach((l) => l())
}

export function resetDb() {
  state = seed()
  persist()
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useDb<T>(selector: (db: DB) => T, deps: unknown[] = []): T {
  const db = useSyncExternalStore(subscribe, getDb, getDb)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => selector(db), [db, ...deps])
}
