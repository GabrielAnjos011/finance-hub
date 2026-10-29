# Evidências de validação local — 28/10/2026

O repositório começou vazio. Esta entrega contém uma implementação inicial integrada; nenhuma conta Firebase ou repositório GitHub de produção foi criado. Os passos para isso estão em COMECE_AQUI.md.

## Resultado

| Verificação               | Resultado                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Vitest + Testing Library  | 42 testes da aplicação, incluindo recuperação sem exigir senha                                                        |
| Firebase Emulator Suite   | 32 testes aprovados (31 regras + duas sessões reais no Authentication Emulator em um fluxo integrado)                 |
| Playwright Chromium       | 21 testes aprovados, sete fluxos repetidos em desktop, viewport Android e viewport iPhone                             |
| Vite produção             | Build local aprovado; manifest, service worker e ícones emitidos                                                      |
| Subdiretório              | `npm run test:static` aprovado: HTML, JavaScript, CSS, ícones, manifest e service worker servidos sob `/finance-hub/` |
| Auditoria npm de produção | `npm audit --omit=dev`: zero avisos conhecidos na consulta após correção de dependências                              |

Os testes de navegador incluem cadastro de conta, lançamento com conferência do saldo, busca, logout, consentimento para relatório IA, prévia CSV, leitura efetiva de XLSX e PDF sintéticos, manifest/SW/ícones, ausência de overflow e contraste do texto no tema escuro. Capturas reais do build em `test-results/dashboard-desktop.png`, `dashboard-android.png` e `dashboard-iphone.png`, todas com dados fictícios sinalizados.

## Correções motivadas pelas verificações

- Compatibilidade do particionamento de chunks com o Vite instalado.
- Diretório de sockets Java no Windows para iniciar o emulador.
- Atualização do estado local somente após confirmação do servidor, sem releitura completa a cada gravação.
- Proteção dos valores destinados a objetivos, além das reservas, na disponibilidade.
- Reserva consolidada limitada ao saldo real da conta, sem duplicar alocações.
- IDs estáveis para repetir um mesmo envio e conservação de centavos nas parcelas.
- Edição de ocorrência recorrente sem recriar a série nem sobrescrever a mesma ocorrência em vários meses.
- Bloqueio na interface de pagamento acima do saldo da fatura e de referências inexistentes.
- Rótulos acessíveis explícitos em selects e inputs dos formulários.
- Registro do service worker já na tela de login.
- Leitura XLSX ajustada à API instalada e encerramento correto do worker PDF.
- Contraste do tema escuro e gráficos sem animação que ocultasse temporariamente os valores nas capturas.
- Substituição do leitor Excel e override gRPC corrigido; auditoria de produção sem avisos conhecidos.
- Recuperação de senha com validação apenas do e-mail, coberta por regressão.

## Escopo dos arquivos

`src/app` controla rotas/layout; `src/features` contém os módulos reais; `src/services` contém Firebase, repositórios, schemas, importação e exportação; `src/store` mantém somente memória; `src/utils` concentra moeda/datas. Regras e índices ficam na raiz; CI em `.github/workflows/deploy.yml`; testes em `tests/`.

## Pendências concretas

Configuração Firebase de produção, publicação de regras, criação de usuários, autorização por UID, repositório remoto, execução real de GitHub Actions, URL final, instalação/atualização em aparelhos físicos e verificação Safari permanecem pendentes. Não se afirma que essas validações foram feitas. Recursos avançados ainda ausentes estão enumerados em ROADMAP.md.

Auditoria npm não é pentest e não garante ausência de falhas. Os testes de viewport iPhone usam Chromium, não Safari. Os emuladores comprovam os cenários escritos contra regras locais; as mesmas regras precisam ser publicadas no projeto correto para proteger dados reais.
