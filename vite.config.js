import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' → 產出相對路徑，可直接部署到 GitHub Pages 任意子路徑（無後端）
// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
})
