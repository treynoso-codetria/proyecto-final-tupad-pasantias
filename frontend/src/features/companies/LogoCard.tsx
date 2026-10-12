import { useQueryClient } from '@tanstack/react-query'
import { Trash2, Upload } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FileCard } from '@/components/ui/FileCard'
import { FilePickerButton } from '@/components/ui/FilePickerButton'
import { getApiErrorKey } from '@/features/auth/errors'
import { offerKeys } from '@/features/offers/api'
import { useErrorText } from '@/features/auth/use-error-text'
import { useFileUpload } from '@/lib/use-file-upload'
import { UPLOAD_RULES } from '@/lib/uploads'
import { companiesApi, companyKeys, type Company } from './api'
import { CompanyLogo } from './CompanyLogo'

export function LogoCard({ company }: { company: Company }) {
  const { t } = useTranslation('profile')
  const errorText = useErrorText()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const logo = useFileUpload({
    rule: UPLOAD_RULES.logo,
    upload: companiesApi.uploadLogo,
    remove: companiesApi.deleteLogo,
    onSaved: (saved) => {
      queryClient.setQueryData(companyKeys.ownCompany, saved)
      // Offers and the public page show the logo too.
      void queryClient.invalidateQueries({ queryKey: offerKeys.all })
      void queryClient.invalidateQueries({ queryKey: companyKeys.allPublic })
      setConfirmOpen(false)
    },
  })

  return (
    <FileCard
      title={t('company.logo.title')}
      hint={t('company.logo.hint')}
      preview={
        <div className="flex items-center gap-4">
          <CompanyLogo company={company} size="lg" />
          {!company.logoUrl && (
            <p className="max-w-xs text-sm">{t('company.logo.none')}</p>
          )}
        </div>
      }
      actions={
        <>
          <FilePickerButton
            accept={UPLOAD_RULES.logo.accept}
            onSelect={logo.select}
            loading={logo.uploading}
            variant={company.logoUrl ? 'secondary' : 'primary'}
          >
            {!logo.uploading && (
              <Upload className="size-4" aria-hidden="true" />
            )}
            {company.logoUrl ? t('files.replace') : t('company.logo.upload')}
          </FilePickerButton>
          {company.logoUrl && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                logo.remove.reset()
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
            title={t('company.logo.confirmTitle')}
            description={t('company.logo.confirmBody')}
            confirmLabel={t('files.delete')}
            cancelLabel={t('files.cancel')}
            onConfirm={() => logo.remove.mutate()}
            confirming={logo.remove.isPending}
            error={
              logo.remove.isError && (
                <Alert>{errorText(getApiErrorKey(logo.remove.error))}</Alert>
              )
            }
          />
        </>
      }
      error={errorText(logo.error)}
      success={logo.done && t(`company.logo.${logo.done}`)}
    />
  )
}
