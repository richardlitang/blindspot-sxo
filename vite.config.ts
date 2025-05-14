import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync, rmSync, readFileSync, writeFileSync } from 'fs'

// Plugin to copy manifest, move HTML, and clean up after build
const chromeExtensionPlugin = () => ({
  name: 'chrome-extension',
  closeBundle() {
    const distDir = resolve(__dirname, 'dist')
    if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true })

    // Copy manifest
    copyFileSync(
      resolve(__dirname, 'manifest.json'),
      resolve(distDir, 'manifest.json')
    )

    // Copy icons if they exist
    const icons = ['icon-16.png', 'icon-48.png', 'icon-128.png']
    icons.forEach((icon) => {
      const src = resolve(__dirname, 'public', icon)
      if (existsSync(src)) {
        copyFileSync(src, resolve(distDir, icon))
      }
    })

    // Move and fix HTML from src/sidepanel to sidepanel
    const srcHtml = resolve(distDir, 'src/sidepanel/index.html')
    const destHtml = resolve(distDir, 'sidepanel/index.html')
    if (existsSync(srcHtml)) {
      // Read, fix paths, and write
      let html = readFileSync(srcHtml, 'utf-8')
      // Fix asset paths
      html = html.replace(/\.\.\/\.\.\/sidepanel\//g, './')
      html = html.replace(/\/sidepanel\//g, './')
      writeFileSync(destHtml, html)
      // Clean up src directory
      rmSync(resolve(distDir, 'src'), { recursive: true, force: true })
    }
  },
})

export default defineConfig({
  plugins: [react(), chromeExtensionPlugin()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'background' ? '[name].js' : 'sidepanel/[name].js'
        },
        chunkFileNames: 'sidepanel/[name].js',
        assetFileNames: 'sidepanel/[name].[ext]',
      },
    },
  },
})
