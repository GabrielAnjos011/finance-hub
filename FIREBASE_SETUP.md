# Configuração do Firebase

O guia visual e sequencial para quem está começando está em [COMECE_AQUI.md](COMECE_AQUI.md). Este arquivo detalha decisões operacionais.

## Serviços e custo

Use o plano **Spark**, um banco Firestore **Standard** padrão e Authentication com e-mail/senha. Não vincule faturamento. A aplicação não utiliza Cloud Functions, Storage, SMS, banco SQL ou backup gerenciado. Arquivos importados não são enviados ao Firebase Storage. As cotas gratuitas consultadas em 28/10/2026 são: 1 GiB de dados Firestore, 50.000 leituras/dia, 20.000 gravações/dia, 20.000 exclusões/dia e 10 GiB de saída/mês para um banco elegível. Regras que consultam documentos podem gerar leituras adicionais. Veja as [cotas oficiais](https://firebase.google.com/docs/firestore/quotas) e a [tabela de preços](https://firebase.google.com/pricing).

O Spark limita o uso; não significa gratuidade ilimitada. Ao esgotar uma cota, a operação pode falhar. O aplicativo trata `resource-exhausted` sem anunciar gravação como concluída. A renovação diária do Firestore segue aproximadamente a meia-noite do Pacífico, não a data local do usuário. Não ative Blaze para resolver uma mensagem de cota.

## Autenticação

1. Ative somente Email/Password no Console.
2. Crie usuários manualmente no Authentication, anotando UIDs.
3. Configure senha forte, proteção contra enumeração e domínios autorizados conforme as opções disponíveis no Console.
4. Inclua `localhost` para desenvolvimento e `SEU_USUARIO.github.io` para Pages. Nunca inclua caminhos no domínio.
5. A aplicação oferece somente login, recuperação e logout. Não publica função de cadastro ou operação administrativa.

Um atacante pode tentar cadastrar-se pela API pública do Authentication: isso **não concede acesso**. O Firestore exige também `authorizedUsers/{uid}.enabled == true`. Administrar essa lista é uma operação privilegiada fora do app.

## Banco e regras

Crie Firestore em modo produção. Copie `firestore.rules` para a aba Regras e publique. Não use regras temporárias `allow read, write: if true`. Crie `authorizedUsers/{UID}` com `enabled` booleano `true` para cada usuário.

Alternativa com CLI, em ambiente administrativo autenticado:

```powershell
npx firebase login
npx firebase use --add
npx firebase deploy --only firestore:rules,firestore:indexes --project SEU_PROJECT_ID
```

Esses comandos são orientações; não foram executados contra uma conta real nesta entrega. Revise o projeto alvo antes de publicar. O cliente não precisa de service account. Mantenha as credenciais da CLI apenas no ambiente do administrador.

## Configuração web

Copie `.env.example` para `.env` e informe os quatro campos públicos da aplicação Web criada no Console. Reinicie o Vite após alterações. No GitHub Actions, use Repository Variables com os mesmos nomes. Nunca inclua segredos em variáveis `VITE_*`.

`VITE_USE_EMULATORS=true` só é interpretado em desenvolvimento (`import.meta.env.DEV`). A compilação de produção ignora a conexão com emuladores. Os testes usam `demo-finance-hub`, que falha em vez de alcançar recursos reais quando um serviço não está emulado.

## App Check

App Check ainda **não está inicializado nem exigido** nesta versão. Não ative enforcement antes de implementar e validar o SDK/provedor, ou os usuários legítimos serão bloqueados. Ele não substitui Rules. Antes de adicioná-lo, verificar cotas e termos atuais do reCAPTCHA e registrar domínio e chave pública; não ativar recursos que exijam faturamento. Veja a [documentação oficial do provedor web](https://firebase.google.com/docs/app-check/web/recaptcha-provider). Authentication com App Check pode exigir capacidades diferentes das usadas aqui; esta entrega não depende disso.

## Verificação administrativa

- Execute `npm run test:rules` antes de publicar alterações nas regras.
- Confirme que uma conta não autorizada recebe permission-denied no SDK, não apenas uma tela escondida.
- Entre com dois usuários reais autorizados após configurar o ambiente; os registros de um não podem aparecer no outro.
- Teste recuperação com sua caixa postal real: o emulador não comprova entrega de e-mail em produção.
- Revogue `enabled` e confira novas leituras no servidor.
- Para casal, use contas diferentes e valide consentimento e desvinculação. Os testes automatizados incluem esses cenários no emulador.
- Acompanhe Firestore → Uso e Authentication → Uso. Contadores locais da sessão são apenas diagnósticos aproximados.

## Problemas frequentes

| Sintoma                  | Conferir                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| Firebase não configurado | `.env` existe, campos preenchidos, Vite reiniciado                                                |
| Login inválido           | usuário criado no Authentication e método Email/Password ativado                                  |
| Usuário não autorizado   | ID do documento é o UID correto; `enabled` é booleano                                             |
| permission-denied        | regras publicadas no projeto correto, autorização ativa, mês aberto                               |
| auth/unauthorized-domain | domínio sem caminho cadastrado nas configurações de Auth                                          |
| resource-exhausted       | painel de cotas; aguardar renovação, reduzir consultas                                            |
| Conflito de revisão      | atualizar os dados antes de salvar novamente                                                      |
| Mudanças não aparecem    | Configurações → Atualizar dados do servidor; outra sessão não é acompanhada por listener contínuo |
