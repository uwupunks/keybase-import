import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import nodePolyfills from 'vite-plugin-node-stdlib-browser';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfills()],
  resolve: {
    alias: {
      components: "/src/components",
      assets: "/src/assets",
      hooks: "/src/hooks",
      src: "/src",
    },
  },
  define: {
    // Global is used as a replacement for global in browser environments
    'global': {},
  },
  optimizeDeps: {
    // This forces Vite to pre-bundle this dependency
    include: ['buffer'],
  },
})
