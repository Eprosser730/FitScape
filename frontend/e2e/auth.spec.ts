import { expect, test, type Page } from '@playwright/test'

// Unique per run, so tests never collide with data from earlier runs.
const unique = () => `e2e_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`

async function signIn(page: Page, username: string, pin: string) {
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('PIN', { exact: true }).fill(pin)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

async function signUp(page: Page, username: string, pin: string) {
  await page.goto('/')
  await expect(page).toHaveURL(/\/signin$/)
  await signIn(page, username, pin)
  await expect(page.getByRole('status')).toContainText(`No account named ${username}`)
  await page.getByLabel('First name').fill('Test')
  await page.getByLabel('Last name').fill('Runner')
  await page.getByLabel('Choose a 4-digit PIN').fill(pin)
  await page.getByLabel('Confirm PIN').fill(pin)
  await page.getByRole('button', { name: 'Create account' }).click()
  // New accounts land on the profile page first; skipping it goes to the dashboard.
  await expect(page.getByRole('heading', { name: 'Tell us about you' })).toBeVisible()
  await page.getByRole('link', { name: 'Skip for now' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome, Test' })).toBeVisible()
}

test('sign up, log out, and sign back in', async ({ page }) => {
  const username = unique()
  await signUp(page, username, '4826')
  await expect(page.getByRole('listitem')).toHaveCount(6)

  await page.reload() // the session cookie keeps you signed in
  await expect(page.getByRole('heading', { name: 'Welcome, Test' })).toBeVisible()

  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/signin$/)
  await page.goto('/')
  await expect(page).toHaveURL(/\/signin$/) // really signed out, not just redirected once

  await signIn(page, username, '4826')
  await expect(page.getByRole('heading', { name: 'Welcome, Test' })).toBeVisible()
})

test('five wrong PINs lock the account', async ({ page }) => {
  const username = unique()
  await signUp(page, username, '4826')
  await page.getByRole('button', { name: 'Log out' }).click()

  for (const left of [4, 3, 2, 1]) {
    await signIn(page, username, '9135')
    await expect(page.getByRole('alert')).toHaveText(
      `Wrong PIN. ${left} ${left === 1 ? 'attempt' : 'attempts'} left.`,
    )
    await page.getByLabel('Username').clear()
    await page.getByLabel('PIN', { exact: true }).clear()
  }
  await signIn(page, username, '9135')
  await expect(page.getByRole('alert')).toContainText('Too many wrong PINs')

  await page.getByLabel('Username').clear()
  await page.getByLabel('PIN', { exact: true }).clear()
  await signIn(page, username, '4826') // the right PIN is refused while locked
  await expect(page.getByRole('alert')).toContainText('Too many wrong PINs')
})

test('profile saves and shows a BMI', async ({ page }) => {
  await signUp(page, unique(), '4826')
  await page.getByRole('link', { name: 'Profile' }).click()
  await page.getByLabel('Gender').selectOption('female')
  await page.getByLabel('Age').fill('30')
  await page.getByLabel('Feet').fill('5')
  await page.getByLabel('Inches').fill('4')
  await page.getByLabel('Weight (lb)').fill('120')
  await page.getByRole('button', { name: 'Save profile' }).click()
  await expect(page.getByText('20.6')).toBeVisible()
  await expect(page.getByText('Healthy weight')).toBeVisible()

  await page.reload() // saved on the server, not just in the page
  await expect(page.getByLabel('Age')).toHaveValue('30')
  await expect(page.getByText('20.6')).toBeVisible()
})

test('prayer journal: write, reload, expand, delete', async ({ page }) => {
  await signUp(page, unique(), '4826')
  await page.getByRole('link', { name: /Prayer & Bible/ }).click()
  await expect(page.getByRole('heading', { name: 'Prayer & Bible' })).toBeVisible()
  await expect(page.getByText(/No entries yet/)).toBeVisible()

  await page.getByLabel('Passage').fill('Psalm 23')
  await page.getByLabel('What did you read or pray about?').fill('The Lord is my shepherd; I shall not want.')
  await page.getByRole('button', { name: 'Save entry' }).click()
  await expect(page.getByText('1 entry')).toBeVisible()

  await page.reload()
  await page.getByText('Psalm 23').click() // expand the note
  await expect(page.locator('.note-body')).toContainText('I shall not want.')
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('button', { name: 'Delete for good' }).click()
  await expect(page.getByText(/No entries yet/)).toBeVisible()
})
