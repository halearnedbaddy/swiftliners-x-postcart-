import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      // Ensure environment variables are available
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || 'https://riohxkjlfanyzlnewjkt.supabase.co'),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpb2h4a2psZmFueXpsbmV3amt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNTIzMzgsImV4cCI6MjA4MzcyODMzOH0.XP7ayrKWYTQWvoWuVhk5DPTuuSlo4vOVAj0Q7IxK8I4'),
    },
    server: {
      host: "0.0.0.0",
      port: 8080,
      allowedHosts: true,
    },
  };
});
