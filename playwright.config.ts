import { defineConfig } from "@playwright/test";
import { API_PORT, BACKEND_DIR, OUTBOX_DIR, STAFF_STATE } from "./e2e/backend";

const PORT = 3200;

// Run `npm run build` first. These tests check the production server against a real backend: the
// backend's scripts/serve_for_e2e.sh starts it with a fresh database and one staff account, and
// writes emails to files, where the tests read log in codes. It needs PostgreSQL running locally,
// and the backend repo next to this one (or BACKEND_DIR pointing at it).
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    // Logs in once through the real screens, and saves the session for the other tests.
    { name: "log in", testMatch: /staff\.setup\.ts/ },
    { name: "dashboard", dependencies: ["log in"], use: { storageState: STAFF_STATE } },
  ],
  webServer: [
    {
      command: `"${BACKEND_DIR}/scripts/serve_for_e2e.sh"`,
      url: `http://127.0.0.1:${API_PORT}/health/`,
      env: { PORT: String(API_PORT), EMAIL_OUTBOX_DIR: OUTBOX_DIR, LOG_LEVEL: "ERROR" },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}/login`,
      reuseExistingServer: false,
      env: { DASHBOARD_API_URL: `http://127.0.0.1:${API_PORT}`, DASHBOARD_APP_KEY: "local-dashboard-app-key" },
    },
  ],
});
