import { lazy, Suspense, type ComponentType } from 'react'
import { FullPageLoader } from '@/components/ui/FullPageLoader'

// Element for a route whose page is loaded on demand. Each page is its own
// chunk, downloaded when its route is first visited, so the initial download
// is only the frame (layouts, guards, i18n). While the page loads, a spinner
// is shown where the page goes.
//
// `name` is the named export of the page module, e.g.
// page(() => import('@/features/offers/pages/OffersPage'), 'OffersPage').
export function page<Name extends string>(
  load: () => Promise<Record<Name, ComponentType>>,
  name: Name,
) {
  const Page = lazy(async () => {
    const module = await load()
    const component: ComponentType = module[name]
    return { default: component }
  })
  return (
    <Suspense fallback={<FullPageLoader fullPage={false} />}>
      <Page />
    </Suspense>
  )
}
