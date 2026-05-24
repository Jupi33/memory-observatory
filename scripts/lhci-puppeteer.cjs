module.exports = async function prepareLighthousePage(browser, context) {
  const page = await browser.newPage()
  await page.goto(context.url, { waitUntil: 'networkidle0' })
  await page.close()
}
