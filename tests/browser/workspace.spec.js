import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { parseNewick } from '../../src/newick.js';

async function paste(page, text) {
  await page.getByLabel('Newick source', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Visualize tree' }).click();
}
async function download(page, testInfo, filename) {
  const promise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Newick' }).click();
  const result = await promise;
  const path = testInfo.outputPath(filename);
  await result.saveAs(path);
  return { text: await readFile(path, 'utf8'), path, name: result.suggestedFilename() };
}

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error; });
  await page.goto('/');
});

test('example, node inspection, zoom, pan, keyboard and topology mode', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await expect(page.locator('#leaf-count')).toHaveText('6');
  await expect(page.locator('.tree-node')).toHaveCount(10);
  await page.getByRole('button', { name: 'Inspect Quercus robur', exact: true }).click();
  await expect(page.locator('#node-label')).toHaveText('Quercus robur');
  await expect(page.locator('#node-length')).toHaveText('0.12');
  const before = await page.locator('#tree-scene').getAttribute('transform');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(page.locator('#tree-scene')).not.toHaveAttribute('transform', before);
  const box = await page.locator('#tree-svg').boundingBox();
  const afterZoom = await page.locator('#tree-scene').getAttribute('transform');
  await page.mouse.move(box.x + 30, box.y + 100); await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 140); await page.mouse.up();
  await expect(page.locator('#tree-scene')).not.toHaveAttribute('transform', afterZoom);
  const afterPan = await page.locator('#tree-scene').getAttribute('transform');
  await page.locator('#tree-svg').focus(); await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#tree-scene')).not.toHaveAttribute('transform', afterPan);
  await page.getByRole('button', { name: 'Topology', exact: true }).click();
  await expect(page.locator('#topology-layout')).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Show branch lengths', { exact: true }).check();
  await expect(page.locator('.length-labels text')).toHaveCount(9);
  await page.getByLabel('Inspect a node', { exact: true }).selectOption({ label: 'Pinus sylvestris' });
  await expect(page.locator('#node-label')).toHaveText('Pinus sylvestris');
  await expect(page.locator('#node-length')).toHaveText('0.2');
  expect(errors).toEqual([]);
});

test('paste, UTF-8 download and real file reimport preserve labels and lengths', async ({ page }, testInfo) => {
  const source = "(('A_B':0,'O''Brien':0.000001)'95':2,β)Anchor:0.5;";
  await paste(page, source);
  await expect(page.locator('#validation')).toContainText('Tree validated');
  await expect(page.locator('#length-layout')).toBeDisabled();
  const result = await download(page, testInfo, 'roundtrip.nwk');
  expect(result.text).toBe("(('A_B':0,'O''Brien':0.000001)'95':2,'β')Anchor:0.5;\n");
  expect(result.text.charCodeAt(0)).not.toBe(0xfeff);
  expect(parseNewick(result.text).trees[0].length).toBe(0.5);
  await page.locator('#file-input').setInputFiles(result.path);
  await expect(page.locator('#document-name')).toHaveText('roundtrip.nwk');
  await expect(page.locator('#leaf-count')).toHaveText('3');
});

test('validation errors retain previous tree and prevent stale export', async ({ page }) => {
  await page.getByLabel('Newick source', { exact: true }).fill('(A:1,B:-2);');
  await expect(page.getByRole('button', { name: 'Export Newick' })).toBeDisabled();
  await page.getByRole('button', { name: 'Visualize tree' }).click();
  await expect(page.getByRole('alert')).toContainText('Negative branch lengths');
  await expect(page.getByRole('alert')).toContainText('line 1, column 8');
  await expect(page.locator('#leaf-count')).toHaveText('6');
  await paste(page, '[&R](A,B);');
  await expect(page.getByRole('alert')).toContainText('annotations are not supported');
  await page.getByRole('button', { name: 'Load example tree' }).click();
  await expect(page.getByRole('button', { name: 'Export Newick' })).toBeEnabled();
});

test('multiple trees, selection, all/current scope and topology-only export', async ({ page }, testInfo) => {
  await paste(page, '(A:0,B:2);(C:3,D:4);');
  await expect(page.locator('#tree-count')).toHaveText('2');
  await page.getByLabel('Select tree', { exact: true }).selectOption({ value: '1' });
  await expect(page.locator('#node-picker')).toContainText('C');
  expect((await download(page, testInfo, 'current.nwk')).text).toBe('(C:3,D:4);\n');
  await page.getByLabel('Export scope', { exact: true }).selectOption('all');
  expect((await download(page, testInfo, 'all.nwk')).text).toBe('(A:0,B:2);\n(C:3,D:4);\n');
  await page.getByLabel('Include lengths on export', { exact: true }).uncheck();
  expect((await download(page, testInfo, 'topology.nwk')).text).toBe('(A,B);\n(C,D);\n');
  await page.getByLabel('Include lengths on export', { exact: true }).check();
  expect((await download(page, testInfo, 'restored.nwk')).text).toContain('A:0');
});

test('file decode errors, hostile labels and responsive workspace', async ({ page }) => {
  await page.locator('#file-input').setInputFiles({ name: 'bad.nwk', mimeType: 'text/plain', buffer: Buffer.from([0xff, 0xfe, 0x41]) });
  await expect(page.getByRole('alert')).toContainText('not valid UTF-8');
  await paste(page, "('<img src=x onerror=alert(1)>':0,B:1);");
  await expect(page.locator('#tree-scene img')).toHaveCount(0);
  await expect(page.locator('#leaf-count')).toHaveText('2');
  await page.getByLabel('Inspect a node', { exact: true }).selectOption({ label: '<img src=x onerror=alert(1)>' });
  await expect(page.locator('#node-label')).toHaveText('<img src=x onerror=alert(1)>');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Export Newick' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
