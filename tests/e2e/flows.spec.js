import { test, expect } from '@playwright/test';
import { xlsxFixture, pdfFixture } from './fixtures';
async function demo(page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Explorar demonstração/ }).click();
  await expect(page.getByRole('heading', { name: /Vamos cuidar dos seus planos/ })).toBeVisible();
}
test('login, navegação e logout limpam o ambiente', async ({ page }) => {
  await demo(page);
  await page.goto('/#/lancamentos');
  await expect(page.getByRole('heading', { name: 'Seu dinheiro em movimento.' })).toBeVisible();
  await page.goto('/#/simuladores');
  await expect(page.getByRole('heading', { name: 'Explore as possibilidades.' })).toBeVisible();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('button', { name: /Entrar no meu Finance Hub/ })).toBeVisible();
});
test('conta, lançamento, pesquisa e saldo real', async ({ page }) => {
  await demo(page);
  await page.goto('/#/contas');
  await page.getByRole('button', { name: 'Adicionar conta', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome da conta').fill('Carteira de teste');
  await dialog.getByLabel('Saldo inicial (R$)').fill('100,00');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Carteira de teste' })).toBeVisible();
  await page.goto('/#/lancamentos');
  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await dialog.getByLabel('Descrição', { exact: true }).fill('Café de teste');
  await dialog.getByLabel('Valor total (R$)').fill('12,34');
  await dialog
    .getByLabel('Conta de origem / pagamento')
    .selectOption({ label: 'Carteira de teste' });
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('textbox', { name: 'Buscar lançamentos' }).fill('Café de teste');
  await expect(page.getByText('Café de teste', { exact: true })).toBeVisible();
  await page.goto('/#/contas');
  const panel = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Carteira de teste', exact: true }) });
  await expect(panel.getByText('R$ 87,66', { exact: true })).toBeVisible();
});
test('relatório exige consentimento e importação possui prévia', async ({ page }) => {
  await demo(page);
  await page.goto('/#/relatorios');
  await expect(page.getByRole('button', { name: 'Gerar prévia da análise' })).toBeDisabled();
  await page.getByLabel(/Autorizo gerar e copiar/).check();
  await page.getByRole('button', { name: 'Gerar prévia da análise' }).click();
  await expect(page.locator('pre')).toContainText('Análise de Saúde Financeira');
  await page.goto('/#/importar');
  await page.getByLabel('Conta do extrato').selectOption('checking');
  await page.getByLabel('Arquivo (até 10 MB)').setInputFiles({
    name: 'extrato.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('data;descricao;valor\n01/10/2026;Teste importado;-15,00'),
  });
  await page.getByRole('button', { name: 'Gerar prévia para revisão' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Teste importado' })).toBeVisible();
});
test('não há overflow nas telas principais', async ({ page }) => {
  await demo(page);
  for (const route of ['/', '/contas', '/lancamentos', '/objetivos', '/cartoes', '/simuladores']) {
    await page.goto('/#' + route);
    await expect(page.locator('.section-intro')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  }
});
test('XLSX e PDF são processados localmente no navegador', async ({ page }) => {
  await demo(page);
  await page.goto('/#/importar');
  await page.getByLabel('Conta do extrato').selectOption('checking');
  for (const [name, buffer, label] of [
    ['extrato.xlsx', xlsxFixture(), 'Teste XLSX'],
    ['extrato.pdf', pdfFixture(), 'Teste PDF'],
  ]) {
    await page.getByLabel('Arquivo (até 10 MB)').setInputFiles({
      name,
      mimeType: name.endsWith('xlsx')
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf',
      buffer,
    });
    await page.getByRole('button', { name: 'Gerar prévia para revisão' }).click();
    await expect(page.getByRole('row').filter({ hasText: label })).toBeVisible();
  }
});
test('PWA tem manifest, ícones e service worker sem cache financeiro', async ({
  page,
  request,
}) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(href)).json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.lang).toBe('pt-BR');
  expect(manifest.icons.some((i) => i.sizes === '512x512')).toBe(true);
  for (const icon of manifest.icons) {
    expect((await request.get('/' + icon.src)).status()).toBe(200);
  }
  const scope = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.scope;
  });
  expect(scope).toBe('http://127.0.0.1:5173/');
  await page.goto('/#/contas');
  await page.reload();
  await expect(page.getByRole('button', { name: /Entrar no meu Finance Hub/ })).toBeVisible();
});
test('captura visual e tema escuro mantêm texto legível', async ({ page }, testInfo) => {
  await demo(page);
  await page.goto('/#/configuracoes');
  await page.getByRole('button', { name: 'Editar preferências' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Tema', { exact: true }).selectOption('dark');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.locator('body').evaluate((el) => getComputedStyle(el).color)).toBe(
    'rgb(225, 230, 220)',
  );
  await page.goto('/#/');
  await expect(page.getByRole('heading', { name: /Vamos cuidar dos seus planos/ })).toBeVisible();
  await expect(page.locator('.recharts-area-curve').first()).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Salvo com sucesso.' })).toBeHidden();
  await page.screenshot({
    path: `test-results/dashboard-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
