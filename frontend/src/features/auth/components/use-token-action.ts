import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ApiError } from '@/api/client'

export type TokenActionState<Result> =
  | { status: 'working' }
  | { status: 'done'; result: Result }
  // `code` is the API error code, or null for a missing token/network error.
  | { status: 'failed'; code: string | null }

// For the screens opened from an emailed link (`?token=...`): runs `action`
// with the token once, when the screen opens, and reports how it went.
export function useTokenAction<Result>(
  action: (token: string) => Promise<Result>,
): TokenActionState<Result> {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [state, setState] = useState<TokenActionState<Result>>(
    token ? { status: 'working' } : { status: 'failed', code: null },
  )
  // These links are single-use, and React runs effects twice in development
  // (StrictMode): the ref keeps the second run from spending the token again.
  const started = useRef(false)
  // `action` is a new function on every render; the effect below must not
  // re-run because of that, so it reads the latest one through a ref.
  const latestAction = useRef(action)
  useEffect(() => {
    latestAction.current = action
  })

  useEffect(() => {
    if (!token || started.current) {
      return
    }
    started.current = true
    latestAction
      .current(token)
      .then((result) => setState({ status: 'done', result }))
      .catch((error: unknown) =>
        setState({
          status: 'failed',
          code: error instanceof ApiError ? error.code : null,
        }),
      )
  }, [token])

  return state
}
