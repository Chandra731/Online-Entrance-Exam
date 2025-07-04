import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: 'index.html',
        login: 'login.html',
        register: 'register.html',
        admin: 'admin.html',
        dashboard: 'dashboard.html',
        'assign-level': 'assign-level.html',
        exam: 'exam.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});