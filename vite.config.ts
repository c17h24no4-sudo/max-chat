/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // относительные пути: приложение работает и в корне, и по подпути (например, /max-chat/)
  plugins: [react()],
  // при разработке запросы /api идут на прокси-сервер (npm run server)
  server: { proxy: { '/api': 'http://localhost:8080' } },
  test: { environment: 'jsdom', setupFiles: './src/setup.ts', globals: true, testTimeout: 15000 },
})
