import { test, expect } from '@playwright/test';
const date = () =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
async function fresh(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Experimentar do zero' }).click();
  await expect(
    page.getByRole('heading', { name: 'Sua vida financeira, em equilíbrio.' }),
  ).toBeVisible();
}
const dialog = (page) => page.getByRole('dialog');
async function saveAccount(page, name = 'Minha conta', amount = '100,00') {
  await dialog(page).getByLabel('Nome da conta').fill(name);
  await dialog(page).getByLabel('Saldo atual (R$)').fill(amount);
  await dialog(page).getByRole('button', { name: 'Salvar', exact: true }).click();
}
async function firstAccount(page) {
  await page.goto('/#/contas');
  await page.getByRole('button', { name: 'Adicionar conta', exact: true }).click();
  await saveAccount(page);
  await expect(page.getByRole('heading', { name: 'Minha conta', exact: true })).toBeVisible();
}
test('primeiro lançamento cria conta antes de preencher e volta para concluir', async ({
  page,
}) => {
  await fresh(page);
  await page.getByRole('button', { name: 'Novo lançamento', exact: true }).click();
  await expect(dialog(page).getByText('Primeiro, diga onde seu dinheiro fica')).toBeVisible();
  await expect(dialog(page).getByLabel('Descrição')).toHaveCount(0);
  await page.getByRole('button', { name: 'Criar minha primeira conta' }).click();
  await saveAccount(page);
  await dialog(page).getByLabel('Descrição').fill('Café do primeiro dia');
  await dialog(page).getByLabel('Valor (R$)').fill('12,34');
  await dialog(page).getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  await page.goto('/#/contas');
  const account = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Minha conta', exact: true }) });
  await expect(account.getByText('R$ 87,66', { exact: true })).toBeVisible();
  await page.goto('/#/');
  await page
    .getByRole('region', { name: 'Seus primeiros passos' })
    .getByRole('button', { name: 'Revisar', exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/#\/contas$/);
  await expect(dialog(page)).toHaveCount(0);
});
test('cadastrar outra conta mantém os dados e a transferência conserva o dinheiro', async ({
  page,
}) => {
  await fresh(page);
  await firstAccount(page);
  await page.goto('/#/lancamentos');
  await page.getByRole('button', { name: 'Novo lançamento', exact: true }).click();
  await dialog(page).getByLabel('Descrição').fill('Transferência com rascunho');
  await dialog(page).getByLabel('Valor (R$)').fill('20,00');
  await dialog(page).getByLabel('O que você quer registrar?').selectOption('transfer');
  await expect(dialog(page).getByText('Uma transferência precisa de duas contas')).toBeVisible();
  await dialog(page).getByRole('button', { name: 'Cadastrar conta de destino' }).click();
  await saveAccount(page, 'Minha reserva', '0');
  await expect(dialog(page).getByLabel('Descrição')).toHaveValue('Transferência com rascunho');
  await expect(dialog(page).getByLabel('Valor (R$)')).toHaveValue('20,00');
  await dialog(page).getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  await page.goto('/#/contas');
  await expect(page.getByText('R$ 80,00', { exact: true })).toBeVisible();
  await expect(page.getByText('R$ 20,00', { exact: true })).toBeVisible();
});
test('cancelar cadastro auxiliar mantém rascunho e receita recorrente não antecipa dinheiro', async ({
  page,
}) => {
  await fresh(page);
  await firstAccount(page);
  await page.goto('/#/lancamentos');
  await page.getByRole('button', { name: 'Novo lançamento', exact: true }).click();
  await dialog(page).getByLabel('O que você quer registrar?').selectOption('income');
  await dialog(page).getByLabel('Descrição').fill('Receita preservada');
  await dialog(page).getByLabel('Valor (R$)').fill('50,00');
  await dialog(page).click({ position: { x: 4, y: 4 } });
  await expect(dialog(page).getByLabel('Descrição')).toHaveValue('Receita preservada');
  await dialog(page).getByRole('button', { name: 'Cadastrar outra conta', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(dialog(page).getByLabel('Descrição')).toHaveValue('Receita preservada');
  await dialog(page).locator('summary').click();
  await dialog(page).getByLabel('Repetir como previsão mensal').check();
  await dialog(page).getByLabel('Quantos meses prever?').fill('3');
  await dialog(page).getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  await page.goto('/#/contas');
  const panel = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Minha conta', exact: true }) });
  await expect(panel.getByText('R$ 150,00', { exact: true })).toBeVisible();
});
test('pode planejar objetivo e reserva sem exigir conta nem inventar saldo', async ({ page }) => {
  await fresh(page);
  await page.goto('/#/objetivos');
  await page.getByRole('button', { name: 'Criar objetivo', exact: true }).click();
  await dialog(page).getByLabel('Nome do objetivo').fill('Minha viagem');
  await dialog(page).getByLabel('Meta (R$)').fill('2000,00');
  await dialog(page).getByLabel('Prazo').fill('2099-01-01');
  await dialog(page).getByLabel('Quanto já guardou (R$)').fill('10,00');
  await expect(dialog(page).getByText('Vamos vincular o dinheiro que já existe')).toBeVisible();
  await dialog(page).getByLabel('Quanto já guardou (R$)').fill('0');
  await expect(dialog(page).getByLabel('Nome do objetivo')).toHaveValue('Minha viagem');
  await expect(dialog(page).getByLabel('Onde esse dinheiro está?')).toHaveCount(0);
  await dialog(page).getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Minha viagem', exact: true })).toBeVisible();
  await expect(page.getByText(/Seu plano começou do zero/)).toBeVisible();
  await page.goto('/#/reserva');
  await page.getByRole('button', { name: 'Criar reserva', exact: true }).click();
  await dialog(page).getByLabel('Nome da reserva').fill('Minha proteção');
  await dialog(page).getByLabel('Quanto quer guardar (R$)').fill('3000,00');
  await dialog(page).getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Minha proteção', exact: true })).toBeVisible();
});
test('cartão nasce dentro da compra e pagamento parcial escolhe a fatura existente', async ({
  page,
}) => {
  await fresh(page);
  await firstAccount(page);
  await page.goto('/#/lancamentos');
  await page.getByRole('button', { name: 'Novo lançamento', exact: true }).click();
  await dialog(page).getByLabel('O que você quer registrar?').selectOption('card_purchase');
  await dialog(page).getByRole('button', { name: 'Cadastrar meu cartão' }).click();
  await dialog(page).getByLabel('Nome do cartão').fill('Meu cartão');
  await dialog(page).getByLabel('Limite (R$)').fill('1000,00');
  await dialog(page).getByLabel('Dia de fechamento').fill('25');
  await dialog(page).getByLabel('Dia de vencimento').fill('5');
  await dialog(page).getByRole('button', { name: 'Salvar', exact: true }).click();
  await dialog(page).getByLabel('Descrição').fill('Compra dividida');
  await dialog(page).getByLabel('Valor total da compra (R$)').fill('90,00');
  await dialog(page).getByLabel('Em quantas parcelas?').fill('3');
  await dialog(page).getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  await page.goto('/#/cartoes');
  await page.getByRole('button', { name: 'Registrar pagamento', exact: true }).first().click();
  await expect(dialog(page).getByLabel('Qual fatura?')).not.toHaveValue('');
  await expect(dialog(page).getByLabel('Competência da fatura')).toHaveCount(0);
  await dialog(page).getByLabel('Valor (R$)').fill('15,00');
  await dialog(page).getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  await page.goto('/#/contas');
  const panel = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Minha conta', exact: true }) });
  await expect(panel.getByText('R$ 85,00', { exact: true })).toBeVisible();
});
test('dinheiro já guardado pede vínculo e não deixa reservar dinheiro inexistente', async ({
  page,
}) => {
  await fresh(page);
  await page.goto('/#/objetivos');
  await page.getByRole('button', { name: 'Criar objetivo', exact: true }).click();
  await dialog(page).getByLabel('Nome do objetivo').fill('Plano preservado');
  await dialog(page).getByLabel('Meta (R$)').fill('1000,00');
  await dialog(page).getByLabel('Prazo').fill('2099-01-01');
  await dialog(page).getByLabel('Quanto já guardou (R$)').fill('150,00');
  await dialog(page).getByRole('button', { name: 'Cadastrar a conta', exact: true }).click();
  await saveAccount(page);
  await expect(dialog(page).getByLabel('Nome do objetivo')).toHaveValue('Plano preservado');
  await expect(dialog(page).getByRole('alert')).toContainText('R$ 100,00');
  await expect(dialog(page).getByRole('button', { name: 'Salvar', exact: true })).toBeDisabled();
  await dialog(page).getByLabel('Quanto já guardou (R$)').fill('50,00');
  await dialog(page).getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Plano preservado', exact: true })).toBeVisible();
});
test('reabertura do mês acontece antes do lançamento e mantém o histórico', async ({ page }) => {
  await fresh(page);
  await firstAccount(page);
  await page.goto('/#/orcamento');
  await page.getByRole('button', { name: 'Fechar mês', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mês fechado', exact: true })).toBeVisible();
  await page.goto('/#/lancamentos');
  await page.getByRole('button', { name: 'Novo lançamento', exact: true }).click();
  await expect(dialog(page).getByText('Este mês já foi conferido e fechado')).toBeVisible();
  await dialog(page).getByLabel('Data', { exact: true }).fill('2099-01-01');
  await expect(dialog(page).getByText('Este mês já foi conferido e fechado')).toHaveCount(0);
  await dialog(page).getByLabel('Data', { exact: true }).fill(date());
  await expect(dialog(page).getByText('Este mês já foi conferido e fechado')).toBeVisible();
  await dialog(page).getByRole('button', { name: 'Reabrir este mês' }).click();
  await dialog(page).getByLabel('Conferi e quero permitir alterações neste mês').check();
  await dialog(page).getByRole('button', { name: 'Salvar', exact: true }).click();
  await dialog(page).getByLabel('Descrição').fill('Após a revisão');
  await dialog(page).getByLabel('Situação').selectOption('confirmed');
  await dialog(page).getByLabel('Valor (R$)').fill('5,00');
  await dialog(page).getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Após a revisão', { exact: true })).toBeVisible();
  await page.goto('/#/orcamento');
  await expect(page.getByRole('heading', { name: 'Mês reaberto', exact: true })).toBeVisible();
});
test('data futura não reduz o saldo e revisão diária não cria lançamento', async ({ page }) => {
  await fresh(page);
  await firstAccount(page);
  await page.goto('/#/lancamentos');
  await page.getByRole('button', { name: 'Novo lançamento', exact: true }).click();
  await dialog(page).getByLabel('Descrição').fill('Conta futura');
  await dialog(page).getByLabel('Valor (R$)').fill('50,00');
  await dialog(page).getByLabel('Data', { exact: true }).fill('2099-01-01');
  await expect(dialog(page).getByLabel('Situação')).toHaveValue('planned');
  await dialog(page).getByRole('button', { name: 'Salvar', exact: true }).click();
  await page.goto('/#/contas');
  await expect(page.getByText('R$ 100,00', { exact: true }).first()).toBeVisible();
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Revisei meu dia' }).click();
  await expect(page.getByRole('heading', { name: 'Você revisou seu dia.' })).toBeVisible();
  await page.getByRole('button', { name: 'Desfazer revisão' }).click();
  await expect(page.getByRole('button', { name: 'Revisei meu dia' })).toBeVisible();
});
test('importação explica a conta primeiro e prévia grande é paginada', async ({ page }) => {
  await fresh(page);
  await page.goto('/#/importar');
  await expect(page.getByLabel('Arquivo (até 10 MB)')).toBeDisabled();
  await page.getByRole('button', { name: 'Cadastrar conta do extrato' }).click();
  await saveAccount(page);
  await expect(page.getByLabel('Arquivo (até 10 MB)')).toBeEnabled();
  const csv =
    'data;descricao;valor\n' +
    Array.from(
      { length: 101 },
      (_, i) => `${date().split('-').reverse().join('/')};Movimento ${i + 1};-1,00`,
    ).join('\n');
  await page
    .getByLabel('Arquivo (até 10 MB)')
    .setInputFiles({ name: 'extrato.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.getByRole('button', { name: 'Gerar prévia para revisão' }).click();
  await expect(page.getByText('Linhas 1 a 100 de 101', { exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Incluir linha 101', exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'Próxima página', exact: true }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Incluir linha 101', exact: true }),
  ).toBeVisible();
});
test('campos mobile têm fonte adequada sem bloquear zoom e teclado não esconde a ação', async ({
  page,
}, info) => {
  await fresh(page);
  await firstAccount(page);
  await page.goto('/#/lancamentos');
  await page.getByRole('button', { name: 'Novo lançamento', exact: true }).click();
  const value = dialog(page).getByLabel('Valor (R$)');
  await expect(value).toHaveAttribute('inputmode', 'decimal');
  if (info.project.name !== 'desktop') {
    expect(
      await value.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(16);
    const sizes = await dialog(page)
      .locator('input:not([type=checkbox]):visible,select:visible,textarea:visible')
      .evaluateAll((elements) => elements.map((el) => parseFloat(getComputedStyle(el).fontSize)));
    expect(sizes.every((size) => size >= 16)).toBe(true);
  }
  expect(await page.locator('meta[name="viewport"]').getAttribute('content')).not.toMatch(
    /user-scalable=no|maximum-scale=1/,
  );
  await value.focus();
  await value.fill('12,34');
  const originalViewport = page.viewportSize();
  if (info.project.name !== 'desktop') {
    const viewport = page.viewportSize();
    await page.setViewportSize({
      width: viewport.width,
      height: Math.max(360, viewport.height - 350),
    });
    await value.focus();
    await expect(page.locator('.app-shell')).toHaveAttribute('data-keyboard-open', 'true');
    await expect(page.locator('.mobile-bottom')).toBeHidden();
    await expect(value).toHaveValue('12,34');
  }
  await expect(dialog(page).getByRole('button', { name: 'Salvar', exact: true })).toBeVisible();
  await expect(dialog(page).getByRole('button', { name: 'Salvar', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.setViewportSize(originalViewport);
  await dialog(page).evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.screenshot({ path: `test-results/guided-form-${info.project.name}.png` });
});
