import { expect, test } from '@playwright/test'

const isWebGLModule = (url: string) =>
  /(@react-three|three|postprocessing|\/src\/cosmic\/CosmicObservatory|\/src\/cosmic\/Atlas)/.test(url)

test('does not request the observatory WebGL path before access is granted', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))

  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Demo archive entrance' })).toBeVisible()
  await page.waitForTimeout(500)

  expect(requests.filter(isWebGLModule)).toEqual([])

  await page.getByRole('textbox', { name: 'cin >>' }).fill('si')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('navigation', { name: 'Vistas del observatorio' })).toBeVisible({
    timeout: 25_000,
  })

  expect(requests.some(isWebGLModule)).toBe(true)
})
