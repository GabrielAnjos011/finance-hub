# Finance Hub

Aplicação estática de organização e planejamento financeiro pessoal em português brasileiro. Dados reais são armazenados no Firestore e protegidos por UID e lista de autorização. Sem backend próprio, Cloud Functions, integrações bancárias ou API de IA paga.

**Comece pelo [guia para configurar do zero](COMECE_AQUI.md).** O projeto não foi publicado nem conectado a um Firebase de produção: o proprietário ainda precisa criar esses recursos e configurar as variáveis públicas.

## Execução

Requisitos: Node.js 24 LTS, npm. Java 21 para o Firebase Emulator Suite.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Sem `.env` configurado, o login exibe instruções e o botão **Explorar demonstração**. A demonstração usa exemplos fictícios, somente em memória; é removida ao sair ou recarregar. Nenhum usuário real é criado automaticamente.

```powershell
npm test
npm run test:rules
npm run test:static
npm run test:e2e
npm run build
npm run preview
```

Antes dos testes E2E, execute `npx playwright install chromium`. O script de regras usa um Java portátil em `.tools/java`, se existente no Windows, ou o Java instalado no sistema. Não precisa de login Firebase para testar `demo-finance-hub`.

## Funcionalidades entregues

- Login por e-mail/senha, recuperação, persistência configurável, autorização no servidor e saída com limpeza da memória.
- Contas, saldos em centavos, contas protegidas, receitas/despesas, transferências, ajustes, previsões, recorrências e filtros.
- Cartões, parcelas com resíduos de centavos preservados, competências e vencimentos, faturas e pagamentos parciais sem duplicação de despesas.
- Orçamentos por categoria, fechamento e reabertura mensal com histórico.
- Reservas e objetivos vinculados ao saldo existente, prazos e aportes planejados.
- Investimentos representados como contas com avaliação manual, sem dupla contagem patrimonial.
- Saúde financeira explicável, alertas, disponibilidade estimada até o salário e sete cenários de simulação.
- Relatórios, CSV/JSON, impressão local/PDF, resumo anônimo para IA com consentimento, backup JSON com integridade e AES-GCM com senha.
- Importação local de CSV/OFX/XLSX e formato restrito de PDF textual, prévia, categorias e fingerprints para duplicados.
- Convite pessoal de casal, vínculo atômico bilateral, indicadores qualitativos com consentimento, metas e contribuições compartilhadas, revogação.
- Interface responsiva, temas claro/escuro/automático, navegação inferior mobile, PWA e pipeline GitHub Pages com testes obrigatórios.

## Stack

React + JavaScript + Vite + Tailwind CSS, componentes próprios acessíveis, Lucide React, Recharts, Firebase Authentication/Firestore, Zustand, React Hook Form/Zod, date-fns, vite-plugin-pwa, Vitest/Testing Library/Playwright e Firebase Emulator Suite. PapaParse, read-excel-file e PDF.js processam arquivos localmente; Excel e PDF são carregados sob demanda. As versões exatas estão no `package.json` e `package-lock.json`.

## Limites importantes

Esta é uma versão inicial integrada, **não o cumprimento integral de todos os critérios do escopo extenso**. Leia [ROADMAP.md](ROADMAP.md) para as lacunas concretas. Não há histórico auditável completo de edição, cotações, lotes fiscais, OCR, sincronização offline de registros, indicadores históricos persistidos, App Check ativado nem implantação validada em produção. Testes de resoluções mobile em Chromium não equivalem a testes em aparelhos físicos ou Safari.

## Documentação

[Arquitetura](ARCHITECTURE.md) · [Firebase](FIREBASE_SETUP.md) · [Segurança](SECURITY.md) · [Modelo de dados](DATA_MODEL.md) · [Regras financeiras](FINANCIAL_RULES.md) · [Publicação](DEPLOYMENT.md) · [Testes](TESTING.md) · [Evolução](ROADMAP.md) · [Pesquisa](MARKET_RESEARCH.md)
