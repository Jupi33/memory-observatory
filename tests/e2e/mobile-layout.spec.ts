import { expect, test, type Page } from '@playwright/test'

async function enterObservatory(page: Page) {
  await page.goto('/')
  await page.getByRole('textbox', { name: 'cin >>' }).fill('si')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('navigation', { name: 'Vistas del observatorio' })).toBeVisible({
    timeout: 25_000,
  })
}

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1)
}

test('mobile atlas and memory detail stay within the viewport', async ({ page }) => {
  await enterObservatory(page)
  await expectNoHorizontalOverflow(page)

  const firstMemory = page
    .getByRole('navigation', { name: 'Abrir recuerdos por teclado' })
    .getByRole('button')
    .first()

  await firstMemory.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expectNoHorizontalOverflow(page)
})
