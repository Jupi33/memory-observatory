const fs = require('fs')

const { chromium } = require('playwright')
const { Launcher } = require('chrome-launcher')

function resolveChromePath() {
  const playwrightChrome = chromium.executablePath()
  if (playwrightChrome && fs.existsSync(playwrightChrome)) return playwrightChrome

  return Launcher.getInstallations()[0]
}

module.exports = {
  ci: {
    collect: {
      chromePath: resolveChromePath(),
      numberOfRuns: 1,
      puppeteerLaunchOptions: {
        args: ['--disable-dev-shm-usage', '--disable-gpu', '--no-sandbox'],
      },
      puppeteerScript: './scripts/lhci-puppeteer.cjs',
      settings: {
        budgetPath: './performance-budget.json',
        preset: 'desktop',
        throttlingMethod: 'simulate',
      },
      staticDistDir: './dist',
      url: ['http://localhost/'],
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.85 }],
        'categories:performance': ['warn', { minScore: 0.45 }],
        'performance-budget': 'error',
        'resource-summary:font:size': ['error', { maxNumericValue: 360000 }],
        'resource-summary:script:size': ['error', { maxNumericValue: 1900000 }],
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 80000 }],
      },
    },
    upload: {
      outputDir: './lhci-report',
      target: 'filesystem',
    },
  },
}
