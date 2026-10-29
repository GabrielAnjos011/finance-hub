# Testes e evidências

## Executar

```powershell
npm ci
npm test
npm run test:rules
npm run test:static
npx playwright install chromium
npm run test:e2e
npm run build
```

Necessários: Node 24 e Java 21. Emuladores baixam artefatos oficiais na primeira execução e usam portas 8080/9099/4400/9150 locais. Não exigem um projeto real nem cartão. O script escolhe `demo-finance-hub`, Auth e Firestore. No Windows há suporte a Java portátil em `.tools/java` e ajuste de diretório para sockets Java.

## Cobertura

| Suíte                           | Cenários principais                                                                                                                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tests/finance.test.js`         | BRL/centavos, resíduo de parcelas, datas, fechamento, ciclo salário, referência de saldo, transferências, pagamentos parciais e estornos, patrimônio, reserva e objetivos, projeção conservadora, saúde, simulação, recorrências previstas |
| `tests/import-export.test.js`   | CSV brasileiro, OFX/FITID, datas impossíveis, fingerprints por conta, semelhantes/faturas para revisão, fórmula CSV, integridade e backup AES-GCM com senha correta/incorreta                                                              |
| `tests/ui.test.jsx`             | Sem cadastro público, demonstração explícita e limpeza ao sair                                                                                                                                                                             |
| `tests/rules/security.test.js`  | 31 cenários de isolamento, schemas, revisões, autorização, mês fechado, convites, lock bilateral, consentimento, dados privados, terceiros e revogação                                                                                     |
| `tests/rules/auth-flow.test.js` | Duas contas reais no Authentication Emulator, bloqueio antes da autorização, escrita própria, recusa de acesso cruzado e novo login                                                                                                        |
| `tests/e2e/flows.spec.js`       | Login demo/rotas/logout, criação de conta e despesa com conferência do saldo, filtros, consentimento IA, prévia CSV/XLSX/PDF, overflow, manifest/SW/ícones e contraste no tema escuro                                                      |

Playwright testa o build de produção, reduzindo diferenças de carregamento de módulos do Vite dev. Os mesmos fluxos rodam em Desktop Chrome, viewport Pixel 7 e viewport iPhone 13 com Chromium. As capturas de demonstração são gravadas em `test-results/dashboard-*.png`, diretório ignorado pelo Git. Traces e screenshot de falha também ficam nesse diretório.

## O que esses testes não comprovam

- Publicação, permissões do repositório e GitHub Actions remotos: o repositório ainda precisa ser criado.
- Login/recuperação em um projeto Firebase de produção, recebimento real de e-mail, cotas reais e domínios.
- Safari/WebKit real, teclado nativo, orientação e instalação em aparelhos físicos.
- Uso prolongado com dezenas de milhares de registros, rollback de restauração em múltiplos lotes e todos os formatos de extratos bancários.
- Pentest independente, requisitos regulatórios ou diagnóstico financeiro certificado.

Os dados de teste e da demonstração são sintéticos. Nunca substitua fixtures por extratos pessoais. Os testes de regras chamam o SDK diretamente, sem depender das rotas da interface.

## Regressão e publicação

O workflow GitHub Actions exige testes da aplicação, regras e E2E antes de publicar. Para alterar reconhecimento financeiro, adicione um cenário que verifique conservação de caixa/patrimônio e ausência de duplicação. Para alterar regras do casal, testar também um terceiro autorizado e a revogação. Não use `skip` para ocultar falha crítica.

Consulte `VALIDATION.md` para o resultado final da execução local desta entrega. Os números de testes podem aumentar com a evolução do projeto.
