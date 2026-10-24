import { readFileSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

// Backend settings for the E2E servers: real env vars win (CI), else backend/.env (local).
function backendEnv(name: string): string {
  if (process.env[name]) return process.env[name]
  try {
    const line = readFileSync('../backend/.env', 'utf8')
      .split(/\r?\n/)
      .find((l) => l.startsWith(`${name}=`))
    if (line) return line.slice(name.length + 1)
  } catch {
    // no backend/.env: fall through to the error below
  }
  throw new Error(`E2E needs ${name} (env var or backend/.env)`)
}

// E2E always runs against the *test* database, never dev or prod.
const testDatabaseUrl = backendEnv('TEST_DATABASE_URL')

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'uv run alembic upgrade head && uv run uvicorn app.main:app --port 8000',
      cwd: '../backend',
      url: 'http://localhost:8000/api/health',
      env: {
        DATABASE_URL: testDatabaseUrl,
        PIN_PEPPER: backendEnv('PIN_PEPPER'),
        COOKIE_SECURE: 'false',
      },
      reuseExistingServer: false, // a reused dev server would point at the dev database
    },
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
  ],
})
