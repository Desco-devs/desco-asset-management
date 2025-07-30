import { test, expect } from '@playwright/test';

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'homepage-test.png' });
  
  // Basic check that the page loaded
  expect(await page.title()).toBeTruthy();
});

test('admin dashboard navigation', async ({ page }) => {
  // This is an example of how you can test specific functionality
  await page.goto('/');
  
  // Example: Test login flow (adjust based on your auth system)
  // await page.click('[data-testid="login-button"]');
  // await page.fill('[data-testid="email"]', 'admin@test.com');
  // await page.fill('[data-testid="password"]', 'password');
  // await page.click('[data-testid="submit"]');
  
  // Verify navigation works
  // await expect(page).toHaveURL('/dashboard');
});