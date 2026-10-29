# Evidências de validação local — 29/10/2026

Atualização de experiência dos itens 1 a 4, descrita em [UX_UPDATE.md](UX_UPDATE.md). O proprietário informou que a primeira versão já foi publicada. Esta validação se refere às alterações locais desta atualização; não comprova uma nova implantação no GitHub Pages.

## Resultado

| Verificação                  | Resultado                                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| Vitest + Testing Library     | 58 testes aprovados, incluindo primeiro uso, pré-requisitos e regras dos formulários                      |
| Firebase Emulator Suite      | 34 testes aprovados, incluindo isolamento da revisão diária e planos de saldo zero sem conta              |
| Playwright                   | 51 testes aprovados: 17 cenários em desktop Chromium, Pixel 7 Chromium e viewport iPhone 13 WebKit        |
| Vite produção                | Build aprovado; manifest, service worker e ícones emitidos                                                |
| GitHub Pages em subdiretório | `npm run test:static` aprovado sob `/finance-hub/`: HTML, scripts, CSS, ícones, manifest e service worker |

Os testes usam dados sintéticos. O Firebase está substituído por mock nos testes unitários; o build E2E recebe configuração Firebase vazia; os testes de regras usam somente o projeto `demo-finance-hub` nos emuladores. O `.env` de produção não é usado para gravar dados de teste.

## Fluxos conferidos

- Primeiro lançamento cria uma conta antes de pedir os demais dados; salva a despesa e confere o saldo.
- Cadastro e cancelamento de conta auxiliar preservam o rascunho. Transferência conserva o total entre as contas; recorrência não antecipa o dinheiro dos próximos meses.
- Objetivos e reservas podem começar com zero sem conta. Um valor já guardado exige vínculo; é possível voltar a zero sem reiniciar o formulário. Alocações acima do saldo disponível são impedidas antes de salvar.
- Cartão criado dentro da compra, divisão em parcelas e pagamento parcial de fatura existente sem duplicar despesa. Cartão sem fatura permite trocar a escolha no próprio aviso.
- Mês fechado é identificado antes do preenchimento. O usuário pode corrigir a data ou reabrir o mês com confirmação e histórico.
- Datas futuras permanecem previstas. Revisão diária e desfazer não criam lançamentos nem confirmam pagamentos.
- Importação bloqueia o arquivo até escolher a conta e mantém seleção por índice na prévia paginada.
- Botões de revisão dos primeiros passos abrem os módulos existentes. Um toque na margem interna do diálogo não descarta o formulário.
- Campos mobile têm fonte de pelo menos 16 px, teclado decimal e zoom manual permitido. A simulação de teclado reduz a altura visível, preserva o valor digitado e mantém a ação Salvar visível.
- Fluxos anteriores de login demo/logout, pesquisa, relatórios com consentimento, importação CSV/XLSX/PDF, contraste, overflow e recursos PWA continuam passando.

As capturas do build são geradas em `test-results/dashboard-*.png` e `test-results/guided-form-*.png`, diretório ignorado pelo Git. As imagens usam somente demonstração sinalizada. Prévias desta atualização também ficam em `docs/`.

## Conferência no aparelho após a publicação

1. Publicar esta atualização pelo workflow existente do GitHub Pages e aguardar a execução terminar.
2. Abrir o app instalado e usar **Atualizar** quando aparecer. Não é necessário desinstalar nem apagar dados.
3. Abrir um lançamento, tocar em valor e descrição, alternar campos e rolar com o teclado aberto. Conferir que não ocorre zoom automático e que é possível salvar.
4. Conferir criar uma conta/cartão dentro do lançamento, voltar ao formulário e cancelar o cadastro auxiliar. Para simular o primeiro uso sem criar dados pessoais, usar **Experimentar do zero** na tela de acesso.

WebKit automatizado e viewports móveis não substituem Safari/Chrome em aparelho físico, teclado nativo, orientação e instalação real do PWA. Não houve nova verificação de login, e-mail ou regras publicadas no Firebase de produção, nem execução remota de GitHub Actions desta atualização.

Push diário não faz parte desta entrega. Nenhuma nova variável GitHub, coleção ou alteração de regras Firestore é necessária para os itens 1 a 4.
