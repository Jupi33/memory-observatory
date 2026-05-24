import { expect, test, type Page } from '@playwright/test'

async function enterObservatory(page: Page) {
  await page.goto('/')
  await page.getByRole('textbox', { name: 'cin >>' }).fill('si')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('navigation', { name: 'Vistas del observatorio' })).toBeVisible({
    timeout: 25_000,
  })
}

async function activeElementIsInside(page: Page, selector: string) {
  return page.evaluate((containerSelector) => {
    const active = document.activeElement
    return active instanceof HTMLElement && Boolean(active.closest(containerSelector))
  }, selector)
}

test('keyboard users can open and close a memory without using the canvas', async ({ page }) => {
  await enterObservatory(page)

  const firstMemory = page
    .getByRole('navigation', { name: 'Abrir recuerdos por teclado' })
    .getByRole('button')
    .first()

  await firstMemory.focus()
  await expect(firstMemory).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('editor and link picker trap focus and close with Escape', async ({ page }) => {
  await enterObservatory(page)
  await page.getByRole('button', { name: 'Agregar recuerdo' }).click()

  const editor = page.getByRole('dialog', { name: /agregar escena/i })
  await expect(editor).toBeVisible()

  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press('Tab')
    expect(await activeElementIsInside(page, '.memory-editor__panel')).toBe(true)
  }

  await page.getByRole('button', { name: /unir con otro recuerdo/i }).click()
  await expect(page.getByRole('dialog', { name: 'Unir con otro recuerdo' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Unir con otro recuerdo' })).toHaveCount(0)
  await expect(editor).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(editor).toHaveCount(0)
})

test('reduced motion still reaches the observatory', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await enterObservatory(page)
  await expect(page.getByText('observatorio vivo')).toBeVisible()
})
