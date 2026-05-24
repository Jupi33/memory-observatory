import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'

import { chromium } from 'playwright'

const require = createRequire(import.meta.url)
const { Launcher } = require('chrome-launcher')

function resolveChromePath() {
  const playwrightChrome = chromium.executablePath()
  if (playwrightChrome && fs.existsSync(playwrightChrome)) return playwrightChrome

  return Launcher.getInstallations()[0]
}

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    env,
    shell: false,
    stdio: 'inherit',
  })

  if (result.error) {
    console.error(result.error)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

run(process.execPath, ['node_modules/@lhci/cli/src/cli.js', 'autorun', '--config=lighthouserc.cjs'], {
  ...process.env,
  CHROME_PATH: resolveChromePath(),
})
