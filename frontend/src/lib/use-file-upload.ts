import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { getApiErrorKey, type ErrorKey } from '@/features/auth/errors'
import { checkFile, type UploadRule } from './uploads'

type FileUploadOptions<T> = {
  rule: UploadRule
  upload: (file: File) => Promise<T>
  remove: () => Promise<T>
  // Receives the updated resource (e.g. to put it in the query cache).
  onSaved: (saved: T) => void
}

// State of a FileCard: checks the chosen file, uploads or deletes it, and
// keeps the outcome of the last action to show it.
export function useFileUpload<T>({
  rule,
  upload,
  remove,
  onSaved,
}: FileUploadOptions<T>) {
  const [outcome, setOutcome] = useState<
    { error: ErrorKey } | { done: 'uploaded' | 'deleted' } | null
  >(null)

  const uploadMutation = useMutation({
    mutationFn: upload,
    onMutate: () => setOutcome(null),
    onSuccess: (saved) => {
      onSaved(saved)
      setOutcome({ done: 'uploaded' })
    },
    onError: (error) => setOutcome({ error: getApiErrorKey(error) }),
  })

  const removeMutation = useMutation({
    mutationFn: remove,
    onMutate: () => setOutcome(null),
    onSuccess: (saved) => {
      onSaved(saved)
      setOutcome({ done: 'deleted' })
    },
  })

  return {
    select(file: File) {
      const error = checkFile(file, rule)
      if (error) {
        setOutcome({ error })
      } else {
        uploadMutation.mutate(file)
      }
    },
    uploading: uploadMutation.isPending,
    remove: removeMutation,
    error: outcome && 'error' in outcome ? outcome.error : undefined,
    done: outcome && 'done' in outcome ? outcome.done : undefined,
  }
}
