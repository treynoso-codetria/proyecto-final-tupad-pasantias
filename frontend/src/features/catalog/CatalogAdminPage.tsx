import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { LoadError } from '@/components/ui/LoadError'
import { PageHeading } from '@/components/ui/PageHeading'
import { getApiErrorKey } from '@/features/auth/errors'
import { useErrorText } from '@/features/auth/use-error-text'
import {
  adminCatalogApi,
  adminCatalogKeys,
  type AdminCategory,
  type AdminTag,
} from './admin-api'
import { NameForm } from './components/NameForm'

// Column sizes: categories.name VARCHAR(100), tags.name VARCHAR(60).
const CATEGORY_NAME_MAX = 100
const TAG_NAME_MAX = 60

export function CatalogAdminPage() {
  const { t } = useTranslation('catalog')

  return (
    <>
      <PageHeading title={t('title')} description={t('description')} />
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <CategoriesPanel />
        <TagsPanel />
      </div>
    </>
  )
}

// Every change reloads the whole catalog, admin and public lists alike.
function useCatalogMutation<Input, Output>(
  mutationFn: (input: Input) => Promise<Output>,
  onSuccess?: () => void,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      onSuccess?.()
      await queryClient.invalidateQueries({ queryKey: adminCatalogKeys.all })
    },
  })
}

function CategoriesPanel() {
  const { t } = useTranslation('catalog')
  const errorText = useErrorText()
  const categories = useQuery({
    queryKey: adminCatalogKeys.categories,
    queryFn: adminCatalogApi.listCategories,
  })
  const [renaming, setRenaming] = useState<string | null>(null)
  // Remounts the "new" form after each addition, which clears it.
  const [addedCount, setAddedCount] = useState(0)

  const create = useCatalogMutation(adminCatalogApi.createCategory, () =>
    setAddedCount((count) => count + 1),
  )
  const rename = useCatalogMutation(
    ({ id, name }: { id: string; name: string }) =>
      adminCatalogApi.updateCategory(id, { name }),
    () => setRenaming(null),
  )
  const toggle = useCatalogMutation((category: AdminCategory) =>
    adminCatalogApi.updateCategory(category.id, {
      isActive: !category.isActive,
    }),
  )

  return (
    <Panel title={t('categories.title')} hint={t('categories.hint')}>
      <NameForm
        key={addedCount}
        label={t('categories.new')}
        submitLabel={t('add')}
        maxLength={CATEGORY_NAME_MAX}
        saving={create.isPending}
        error={create.error}
        onSubmit={(name) => create.mutate(name)}
      />
      {toggle.isError && <Alert>{errorText(getApiErrorKey(toggle.error))}</Alert>}
      <ItemList
        query={categories}
        empty={t('categories.empty')}
        render={(category) =>
          renaming === category.id ? (
            <NameForm
              label={t('name')}
              submitLabel={t('save')}
              maxLength={CATEGORY_NAME_MAX}
              initialName={category.name}
              saving={rename.isPending}
              error={rename.error}
              onSubmit={(name) => rename.mutate({ id: category.id, name })}
              onCancel={() => setRenaming(null)}
            />
          ) : (
            <ItemRow
              name={category.name}
              slug={category.slug}
              offersCount={category.offersCount}
              badge={
                category.isActive ? (
                  <Badge tone="success">{t('categories.active')}</Badge>
                ) : (
                  <Badge tone="muted">{t('categories.inactive')}</Badge>
                )
              }
              actions={
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      rename.reset()
                      setRenaming(category.id)
                    }}
                  >
                    {t('rename')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={toggle.isPending && toggle.variables?.id === category.id}
                    onClick={() => toggle.mutate(category)}
                  >
                    {category.isActive
                      ? t('categories.deactivate')
                      : t('categories.activate')}
                  </Button>
                </>
              }
            />
          )
        }
      />
    </Panel>
  )
}

function TagsPanel() {
  const { t } = useTranslation('catalog')
  const errorText = useErrorText()
  const tags = useQuery({
    queryKey: adminCatalogKeys.tags,
    queryFn: adminCatalogApi.listTags,
  })
  const [renaming, setRenaming] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<AdminTag | null>(null)
  const [addedCount, setAddedCount] = useState(0)

  const create = useCatalogMutation(adminCatalogApi.createTag, () =>
    setAddedCount((count) => count + 1),
  )
  const rename = useCatalogMutation(
    ({ id, name }: { id: string; name: string }) =>
      adminCatalogApi.renameTag(id, name),
    () => setRenaming(null),
  )
  const remove = useCatalogMutation(
    (tag: AdminTag) => adminCatalogApi.deleteTag(tag.id),
    () => setToDelete(null),
  )

  return (
    <Panel title={t('tags.title')} hint={t('tags.hint')}>
      <NameForm
        key={addedCount}
        label={t('tags.new')}
        submitLabel={t('add')}
        maxLength={TAG_NAME_MAX}
        saving={create.isPending}
        error={create.error}
        onSubmit={(name) => create.mutate(name)}
      />
      <ItemList
        query={tags}
        empty={t('tags.empty')}
        render={(tag) =>
          renaming === tag.id ? (
            <NameForm
              label={t('name')}
              submitLabel={t('save')}
              maxLength={TAG_NAME_MAX}
              initialName={tag.name}
              saving={rename.isPending}
              error={rename.error}
              onSubmit={(name) => rename.mutate({ id: tag.id, name })}
              onCancel={() => setRenaming(null)}
            />
          ) : (
            <ItemRow
              name={tag.name}
              slug={tag.slug}
              offersCount={tag.offersCount}
              actions={
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      rename.reset()
                      setRenaming(tag.id)
                    }}
                  >
                    {t('rename')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      remove.reset()
                      setToDelete(tag)
                    }}
                  >
                    {t('tags.delete')}
                  </Button>
                </>
              }
            />
          )
        }
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={t('tags.deleteTitle')}
        description={t('tags.deleteText', {
          name: toDelete?.name ?? '',
          count: toDelete?.offersCount ?? 0,
        })}
        confirmLabel={t('tags.deleteConfirm')}
        cancelLabel={t('cancel')}
        confirming={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete)}
        error={remove.isError && <Alert>{errorText(getApiErrorKey(remove.error))}</Alert>}
      />
    </Panel>
  )
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: ReactNode
}) {
  return (
    <Card className="space-y-5 p-6 sm:p-8">
      <div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted">{hint}</p>
      </div>
      {children}
    </Card>
  )
}

function ItemList<Item extends { id: string }>({
  query,
  empty,
  render,
}: {
  query: {
    isPending: boolean
    isError: boolean
    data?: Item[]
    refetch: () => unknown
  }
  empty: string
  render: (item: Item) => ReactNode
}) {
  if (query.isPending) {
    return <FullPageLoader fullPage={false} />
  }
  if (query.isError || !query.data) {
    return <LoadError onRetry={() => void query.refetch()} />
  }
  if (query.data.length === 0) {
    return <p className="text-sm text-muted">{empty}</p>
  }
  return (
    <ul className="divide-y-2 divide-ink/10 border-t-2 border-ink/10">
      {query.data.map((item) => (
        <li key={item.id} className="py-4">
          {render(item)}
        </li>
      ))}
    </ul>
  )
}

function ItemRow({
  name,
  slug,
  offersCount,
  badge,
  actions,
}: {
  name: string
  slug: string
  offersCount: number
  badge?: ReactNode
  actions: ReactNode
}) {
  const { t } = useTranslation('catalog')

  return (
    // Actions always in the same place: below on phones, right-aligned in a
    // fixed column from there on, whatever the length of the name.
    <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-bold">
          {name}
          {badge}
        </p>
        <p className="text-sm text-muted">
          {slug} · {t('offers', { count: offersCount })}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">{actions}</div>
    </div>
  )
}
