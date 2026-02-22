import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import manifest from './manifest.json' with { type: 'json' };

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      // Bypass the package's exports map so we can import the WASM loader directly.
      // This file is an Emscripten-generated UMD module exporting ModuleFactory.
      'mediapipe-vision-wasm-internal': resolve(
        __dirname,
        'node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js'
      ),
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/main.jsx',
        content: 'src/content/content.jsx',
        background: 'src/background/background.js',
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
