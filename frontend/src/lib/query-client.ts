import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/client'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retrying only helps with network failures and server errors: a 4xx
      // answer (not found, forbidden...) will be the same the next time.
      retry: (failureCount, error) =>
        failureCount < 2 &&
        !(
          error instanceof ApiError &&
          error.status >= 400 &&
          error.status < 500
        ),
      staleTime: 30_000,
    },
  },
})
