import { expect, test } from '@playwright/test'

test('opens the observatory and switches primary views', async ({ page }, testInfo) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))

  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Demo archive entrance' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('01-entrance.png') })

  await page.getByRole('textbox', { name: 'cin >>' }).fill('si')
  await page.keyboard.press('Enter')

  await expect(page.getByText('observatorio vivo')).toBeVisible({ timeout: 25_000 })
  await expect(page.getByRole('navigation', { name: 'Vistas del observatorio' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('02-atlas.png') })

  await page.getByRole('button', { name: 'Trayectoria' }).click()
  await expect(page.getByLabel('Trayectoria de recuerdos')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('03-trajectory.png') })

  await page.getByRole('button', { name: 'Carta' }).click()
  await expect(page.getByLabel('Carta viva')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('04-letter.png') })

  await page.getByRole('button', { name: 'Atlas' }).click()
  await page.getByRole('button', { name: 'Agregar recuerdo' }).click()
  await expect(page.getByRole('dialog', { name: /agregar escena/i })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('05-editor.png') })

  expect(consoleErrors).toEqual([])
})
