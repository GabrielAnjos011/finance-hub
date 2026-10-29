# Melhoria de experiência — 29/10/2026

Implementação dos itens 1 a 4 aprovados pelo proprietário. Push diário fica para uma etapa posterior.

## O que mudou

- Campos de edição em mobile com fonte mínima de 16 px e teclado decimal para dinheiro. O zoom manual continua permitido.
- Formulários adaptados à altura visível quando o teclado ocupa a tela, com ação de salvar fixa no diálogo. A navegação inferior sai da frente durante a edição com teclado.
- Lançamentos mostram os campos da operação escolhida. Compra no cartão mostra cartão/parcelas; transferência mostra origem/destino; pagamento escolhe uma fatura existente e calcula sua competência sem pedir esse termo ao usuário.
- Datas futuras ficam previstas, com uma explicação; não são transformadas automaticamente em pagamento confirmado.
- Campos adicionais ficam em **Mais opções**. Erros de moeda, datas, valores e seleção são apresentados junto do campo.
- Contas e cartões podem ser criados dentro do lançamento. A conta/cartão criado é selecionado e o formulário anterior mantém os valores digitados. Cancelar o cadastro auxiliar também volta ao preenchimento anterior.
- Sem conta, sem segundo destino, sem cartão, sem fatura ou com mês fechado, a orientação aparece antes de preencher o restante. Mês fechado oferece reabertura com confirmação e preservação do histórico.
- Os avisos mantêm os controles necessários para corrigir a escolha: trocar cartão, escolher outra data ou voltar o valor guardado para zero. Não é preciso reiniciar o formulário.
- Conta inicial pede nome e saldo atual; dados adicionais podem ser preenchidos depois. Nunca é criada uma conta fictícia nem é presumido saldo zero.
- Objetivos e reservas podem começar sem conta quando o valor já guardado é zero. Valores positivos exigem vínculo e não podem ultrapassar o saldo sem destino em outros planos.
- Dashboard e configurações oferecem três passos: conta, primeiro lançamento e planejamento pessoal. Completar todos não é requisito para usar os módulos independentes.
- Revisar um passo concluído abre os registros existentes. Toques nas margens internas do diálogo não descartam o preenchimento.
- Projeções sem dia de salário configurado são identificadas como pendentes no dashboard, na saúde e no relatório para IA.
- A revisão manual do dia funciona inclusive sem movimentos. Ela registra somente que o usuário revisou o dia; não cria despesas, não confirma pagamentos e pode ser desfeita.
- Importação exige escolher a conta antes de processar o arquivo. A prévia exibe 100 linhas por página para evitar renderizar milhares de controles de uma vez.
- Há uma opção explícita **Experimentar do zero** na demonstração para conhecer o primeiro uso sem criar dados reais.

## Dados, segurança e compatibilidade

As coleções e os modelos financeiros existentes foram mantidos. A revisão diária usa o caminho privado `alertStates/daily_review_YYYY-MM-DD`, com os campos já permitidos pelas regras (`read` e `snoozeUntil`). Não usa notificações externas nem depende de novas permissões do Firestore. Não é necessário criar nova variável no GitHub para esta atualização.

Não há migração destrutiva de dados. Reservas e objetivos antigos continuam válidos; os novos planos sem conta têm saldo destinado zero. Conflitos de revisão e gravações continuam sujeitos às transações e regras atuais.

Os testes unitários têm o cliente Firebase substituído por um mock. O build dos testes de navegador usa configuração Firebase vazia e somente a demonstração. Os testes de segurança usam exclusivamente `demo-finance-hub` nos emuladores. Nenhum lançamento de teste é gravado no banco de produção.

## Verificação e publicação

Resultados registrados em [VALIDATION.md](VALIDATION.md): 58 testes da aplicação, 34 nos emuladores e 51 de navegação aprovados, além do build e da verificação de subdiretório. Esta atualização está preparada no projeto local; não foi enviada ao GitHub nem publicada por esta execução. Depois de enviar as alterações para `main`, o workflow existente valida e publica a nova versão. As quatro variáveis Firebase atuais continuam suficientes.

Execute `npm test`, `npm run test:rules`, `npm run test:static` e `npm run test:e2e`. O CI instala Chromium e WebKit. Há testes de primeiro uso vazio, cadastros auxiliares, conservação do saldo, faturas, planos sem dinheiro, alocação excessiva, reabertura, revisão diária, importação paginada e comportamento de campos/viewport mobile.

WebKit automatizado e simulação de redução da altura visível não substituem a conferência em um iPhone/Android físico com teclado nativo. Depois da publicação, abrir o PWA, aplicar a atualização oferecida e conferir o formulário de lançamento no aparelho. Não é necessário desinstalar o PWA nem apagar dados.

Esta alteração não configura push. A escolha do emissor/agendamento e a autorização para notificações ficam para a próxima fase.
