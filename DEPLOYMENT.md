# Publicação estática

## Pré-requisitos

Crie Firebase e repositório seguindo COMECE_AQUI.md. No GitHub Free, Pages está disponível para repositórios públicos; isso torna o código público, não os documentos privados do Firestore. Não publique dados reais nem backups no repositório. [Disponibilidade oficial do Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

Antes de produção, avalie também os [termos e limites do Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), especialmente uso com credenciais e eventual uso comercial. Não se promete que uma aplicação financeira autenticada tenha aprovação de uso da plataforma só porque o build funciona. A alternativa Firebase Hosting no Spark pode hospedar o mesmo `dist/`, dentro das cotas gratuitas; não exige backend próprio.

## GitHub Actions

1. Envie o projeto para `main`.
2. Configure Pages → Source → GitHub Actions.
3. Configure as quatro Repository Variables públicas Firebase descritas no guia.
4. Execute o workflow `.github/workflows/deploy.yml` ou faça push para `main`.
5. O workflow instala Node 24 e Java 21, usa `npm ci`, executa Vitest, Authentication/Firestore Emulator e Playwright Chromium, faz build com Firebase e `VITE_BASE_PATH`, publica o artefato e faz deploy.
6. Pull requests executam validações e build, sem deploy. Configuração ausente ou testes falhando bloqueiam produção.

Regras de banco não são publicadas pelo workflow Pages: isso é uma ação administrativa separada. Publique-as no Firebase Console ou com Firebase CLI, nunca adicionando service account ao build ou ao repositório.

O workflow usa Actions oficiais, com permissões de leitura no job de validação e `pages:write`/`id-token:write` somente no deploy. Há exclusão mútua por branch. Não foi executado em um repositório remoto nesta entrega, pois ele ainda não existe.

## Subdiretório e rotas

Para `https://USUARIO.github.io/finance-hub/`, o base é `/finance-hub/`. O workflow deriva esse valor do nome do repositório. Todas as rotas usam hash: `#/contas`, `#/lancamentos` etc. Atualizar a página não exige regra de rewrite no servidor.

Para o repositório especial `USUARIO.github.io` ou domínio próprio na raiz, altere o env do passo Build para `VITE_BASE_PATH: /`. Para subcaminho personalizado, use barra inicial e final. Veja o [guia oficial do Vite](https://vite.dev/guide/static-deploy.html).

Para testar um base diferente localmente no PowerShell:

```powershell
$env:VITE_BASE_PATH='/finance-hub/'
npm run build
npm run preview
```

Abra `http://127.0.0.1:4173/finance-hub/`. Ao terminar, remova a variável dessa sessão com `Remove-Item Env:VITE_BASE_PATH`, ou feche o terminal. Não confunda esse teste local com uma publicação remota.

## PWA

O manifest, ícones PNG 192/512, Apple touch icon, início/escopo e fallback do service worker usam o mesmo base. Instalação depende de HTTPS e suporte do navegador. Android pode oferecer botão instalar. iOS/Safari usa Compartilhar → Adicionar à Tela de Início. Uma nova versão oferece atualização controlada, não recarrega um formulário automaticamente.

Somente o shell é cacheado. Dados financeiros em memória desaparecem ao recarregar; acesso real exige conexão e autorização. Limpar cache da aplicação no navegador remove o shell e tokens persistentes conforme as opções escolhidas pelo usuário.

## Lista de conferência pós-publicação

- URL usa HTTPS e arquivos JS/CSS/ícones retornam 200 no subdiretório.
- Login autorizado, logout, recuperação real de e-mail e persistência funcionam no domínio cadastrado.
- Segundo usuário não vê dados do primeiro.
- Um usuário fora da lista não acessa o banco, mesmo via SDK.
- Criar conta, lançamento, parcela, pagamento parcial e transferência; conferir após nova sessão.
- Convite, consentimento e revogação em duas contas.
- Instalar PWA e testar atualização em Android e Safari/iPhone reais.
- Conferir cotas e exportar/restaurar um backup em ambiente de teste antes de depender dele.

Esses passos de produção ainda dependem da configuração do proprietário. Nenhuma evidência local é apresentada como validação de infraestrutura remota.
