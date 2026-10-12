import { useQueryClient } from '@tanstack/react-query'
import { FileText, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FileCard } from '@/components/ui/FileCard'
import { FilePickerButton } from '@/components/ui/FilePickerButton'
import { getApiErrorKey } from '@/features/auth/errors'
import { useErrorText } from '@/features/auth/use-error-text'
import { useFileUpload } from '@/lib/use-file-upload'
import { UPLOAD_RULES } from '@/lib/uploads'
import { studentKeys, studentsApi, type StudentProfile } from './api'

export function CvCard({ profile }: { profile: StudentProfile }) {
  const { t } = useTranslation('profile')
  const errorText = useErrorText()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const cv = useFileUpload({
    rule: UPLOAD_RULES.cv,
    upload: studentsApi.uploadCv,
    remove: studentsApi.deleteCv,
    onSaved: (saved) => {
      queryClient.setQueryData(studentKeys.ownProfile, saved)
      setConfirmOpen(false)
    },
  })
  const fileName = profile.cvFileName ?? 'CV.pdf'

  return (
    <FileCard
      title={t('student.cv.title')}
      hint={t('student.cv.hint')}
      preview={
        profile.cvUrl ? (
          <a
            href={profile.cvUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('student.cv.open', { name: fileName })}
            className="flex min-w-0 items-center gap-2 font-bold underline decoration-2 underline-offset-4 hover:bg-accent"
          >
            <FileText className="size-5 shrink-0" aria-hidden="true" />
            <span className="truncate">{fileName}</span>
          </a>
        ) : (
          <p className="text-sm">{t('student.cv.none')}</p>
        )
      }
      actions={
        <>
          <FilePickerButton
            accept={UPLOAD_RULES.cv.accept}
            onSelect={cv.select}
            loading={cv.uploading}
            variant={profile.cvUrl ? 'secondary' : 'primary'}
          >
            {!cv.uploading && <Upload className="size-4" aria-hidden="true" />}
            {profile.cvUrl ? t('files.replace') : t('student.cv.upload')}
          </FilePickerButton>
          {profile.cvUrl && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                cv.remove.reset()
                setConfirmOpen(true)
              }}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {t('files.delete')}
            </Button>
          )}
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={t('student.cv.confirmTitle')}
            description={t('student.cv.confirmBody')}
            confirmLabel={t('files.delete')}
            cancelLabel={t('files.cancel')}
            onConfirm={() => cv.remove.mutate()}
            confirming={cv.remove.isPending}
            error={
              cv.remove.isError && (
                <Alert>{errorText(getApiErrorKey(cv.remove.error))}</Alert>
              )
            }
          />
        </>
      }
      error={errorText(cv.error)}
      success={cv.done && t(`student.cv.${cv.done}`)}
    />
  )
}
