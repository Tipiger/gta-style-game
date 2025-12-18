import { defineConfig } from 'vite'

export default defineConfig({
  base: '/gta-style-game/',
  server: {
    port: 5173,
    host: '0.0.0.0', // 允许所有网络接口访问
    open: true
  },
  build: {
    target: 'ES2020',
    outDir: 'dist'
  }
})
