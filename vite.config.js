import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/MahaSmart-Waste-Route-Planner/',
  server: {
    port: 3000
  }
});
