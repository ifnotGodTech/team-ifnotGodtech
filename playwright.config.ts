import { defineConfig } from "@playwright/test";

const PORT = 3200;

// Run `npm run build` first. These tests check the production server.
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/clients`,
    reuseExistingServer: false,
    // No backend in tests: every call fails cleanly as unavailable.
    env: { DASHBOARD_API_URL: "" },
  },
});
