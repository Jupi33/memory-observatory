import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function enterObservatory(page: Page) {
  await page.goto('/')
  await page.getByRole('textbox', { name: 'cin >>' }).fill('si')
  await page.keyboard.press('Enter')
  await expect(page.getByText('observatorio vivo')).toBeVisible({ timeout: 25_000 })
}

async function expectNoSevereA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const severeViolations = results.violations.filter((violation) =>
    ['critical', 'serious'].includes(violation.impact ?? ''),
  )

  expect(severeViolations).toEqual([])
}

test('entrance has no severe automated accessibility violations', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Demo archive entrance' })).toBeVisible()
  await expectNoSevereA11yViolations(page)
})

test('observatory atlas and editor have no severe automated accessibility violations', async ({ page }) => {
  await enterObservatory(page)
  await expectNoSevereA11yViolations(page)

  await page.getByRole('button', { name: 'Agregar recuerdo' }).click()
  await expect(page.getByRole('dialog', { name: /agregar escena/i })).toBeVisible()
  await expectNoSevereA11yViolations(page)
})
