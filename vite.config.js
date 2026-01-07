import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/shakeeb-sa-poker-game-react-js/', // This MUST match your repo name
})