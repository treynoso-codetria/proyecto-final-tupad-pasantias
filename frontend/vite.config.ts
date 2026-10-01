import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Resolves the `@/*` alias declared in tsconfig.app.json.
    tsconfigPaths: true,
    // Guard against a second copy of React. Some backend tooling (Prisma
    // Studio) also depends on React, and if npm ever hoists a different
    // version to the root node_modules, the libraries hoisted next to it
    // (react-i18next, react-hook-form, ...) would use that copy and every
    // hook would fail at runtime, while the build still passes.
    dedupe: ['react', 'react-dom'],
  },
})
