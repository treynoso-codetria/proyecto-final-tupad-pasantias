import 'i18next'
import type { resources } from './index'

// Makes t() type-safe: keys are checked against the English JSON files.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: (typeof resources)['en']
  }
}
