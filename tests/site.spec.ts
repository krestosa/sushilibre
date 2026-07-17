import { expect, test } from '@playwright/test';

const expectedSections = ['PIEZAS', 'NIGUIRIS', 'SASHIMIS', 'GEISHA', 'BEBIDAS'];

test('renders the unchanged experience without runtime errors', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.title-word--sushi')).toHaveText('SUSHI');
  await expect(page.locator('.title-word--libre')).toHaveText('LIBRE');
  await expect(page.locator('.booking-dock')).toBeVisible();
  await expect(page.locator('[data-menu-status]')).toBeHidden();
  await expect(page.locator('[data-menu-group]')).toHaveCount(5);
  await expect(page.locator('.menu-group__title')).toHaveText(expectedSections);

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const isMobile = (viewport?.width || 0) <= 720;

  const layout = await page.evaluate(() => {
    const dock = document.querySelector<HTMLElement>('.booking-dock');
    const title = document.querySelector<HTMLElement>('.title-lockup');
    const menuHeading = document.querySelector<HTMLElement>('.menu-section__intro h2');
    if (!dock || !title || !menuHeading) throw new Error('Required layout nodes are missing');
    const dockStyle = getComputedStyle(dock);
    const titleStyle = getComputedStyle(title);
    const menuStyle = getComputedStyle(menuHeading);
    return {
      dockDisplay: dockStyle.display,
      dockColumns: dockStyle.gridTemplateColumns,
      titleDisplay: titleStyle.display,
      titlePosition: titleStyle.position,
      menuTransform: menuStyle.textTransform,
      orange: getComputedStyle(document.documentElement).getPropertyValue('--orange').trim()
    };
  });

  expect(layout.dockDisplay).toBe('grid');
  expect(layout.titleDisplay).toBe('grid');
  expect(layout.titlePosition).toBe('absolute');
  expect(layout.menuTransform).toBe('uppercase');
  expect(layout.orange).toBe('#dd702d');
  expect(layout.dockColumns.split(' ').length).toBeGreaterThanOrEqual(isMobile ? 3 : 4);

  await page.screenshot({
    path: testInfo.outputPath(isMobile ? 'mobile-render.png' : 'desktop-render.png'),
    fullPage: true,
    animations: 'disabled'
  });

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
