import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// WICHTIG: "base" muss dem Namen deines GitHub-Repos entsprechen,
// genau wie bei deiner Tennis-App (z. B. "/Family-Planner/").
// Wenn du lokal testest (npm run dev), ist das egal.
export default defineConfig({
  plugins: [react()],
  base: '/Family-Planner/',
});
