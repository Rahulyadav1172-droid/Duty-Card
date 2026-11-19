import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
            if (id.includes('xlsx') || id.includes('mammoth')) return 'vendor-excel';
            if (id.includes('@supabase')) return 'vendor-supabase';
          }
          if (id.includes('duty_data.json')) return 'data-chaudah-kosi';
          if (id.includes('panch_kosi_data.json')) return 'data-panch-kosi';
          if (id.includes('electionStandardData.js')) return 'data-election-standards';
        }
      }
    },
    chunkSizeWarningLimit: 1200
  }
});
