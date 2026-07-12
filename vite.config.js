import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://iuiuiu.eu.org:3000',
        changeOrigin: true
      }
    }
  }
})
