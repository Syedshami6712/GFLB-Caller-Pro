import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/GFLB-Caller-Pro/',
  server: {
    open: true, // Set to 'msedge' to force Microsoft Edge on Windows
  }
})
