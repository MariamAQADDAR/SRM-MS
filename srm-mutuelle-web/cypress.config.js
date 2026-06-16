import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    supportFile: false, // Pas besoin de fichier support pour commencer simple
  },
});
