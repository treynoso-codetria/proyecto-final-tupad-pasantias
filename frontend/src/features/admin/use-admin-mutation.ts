import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminKeys } from './api'

// Moderation changes the admin metrics, lists and log, and also what the
// offer and company pages show; all of them are reloaded.
export function useAdminMutation<Input, Output>(
  mutationFn: (input: Input) => Promise<Output>,
  onSuccess?: (output: Output, input: Input) => void,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async (output, input) => {
      onSuccess?.(output, input)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['offers'] }),
        queryClient.invalidateQueries({ queryKey: ['companies'] }),
      ])
    },
  })
}
