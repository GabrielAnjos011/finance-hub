# Comece aqui — Finance Hub do zero

Você não precisa cadastrar cartão de crédito nem contratar serviços para começar. Os passos abaixo criam a estrutura na sua própria conta. A aplicação já está no diretório deste projeto; os recursos de nuvem ainda não foram criados.

## 1. Explore a aplicação local

Abra um terminal na pasta do projeto e execute:

```powershell
npm ci
npm run dev
```

Abra o endereço `Local` mostrado pelo Vite. Clique em **Explorar demonstração**. O aviso identifica que os números são fictícios. Nada da demonstração vai para o Firebase.

## 2. Crie seu projeto Firebase

1. Entre no [Console Firebase](https://console.firebase.google.com/) com sua conta Google.
2. Clique em **Criar projeto**, escolha um nome, por exemplo `Finance Hub`, e um ID disponível.
3. O Google Analytics é opcional e não é necessário para este aplicativo; pode ficar desativado.
4. Confirme que o projeto está no **Spark**. Não vincule conta de faturamento, não ative Blaze e não habilite a avaliação com créditos do Google Cloud.
5. Abra as configurações do projeto (engrenagem), seção **Seus apps**, e adicione um aplicativo **Web** (`</>`).
6. Escolha um apelido. Não é necessário configurar Firebase Hosting porque a hospedagem será GitHub Pages.
7. Copie os campos públicos `apiKey`, `authDomain`, `projectId` e `appId` do objeto `firebaseConfig`.

Esses quatro campos identificam o app, não são chaves administrativas. Nunca gere nem envie uma service account para o frontend.

## 3. Ative o login e crie os usuários

1. Em **Build → Authentication**, clique em começar.
2. Em métodos de login, ative somente **E-mail/senha**.
3. Em **Usuários → Adicionar usuário**, crie sua conta com e-mail e senha.
4. Copie o **UID** exibido na lista de usuários. Ele será usado no próximo passo.
5. Se quiser modo casal, repita para a outra pessoa. Cada pessoa usa sua própria conta.
6. Confira as configurações de política de senha e proteção contra enumeração de e-mails. Não ative autenticação por SMS: ela não faz parte desta implementação.

## 4. Crie o banco e publique as regras

1. Em **Build → Firestore Database**, crie o banco **padrão**, na edição **Standard**. Escolha uma região adequada; ela não pode ser trocada facilmente depois. Não crie um banco Enterprise.
2. Escolha o **modo de produção**, que começa negando acesso.
3. Na aba **Regras**, substitua todo o conteúdo pelo arquivo `firestore.rules` deste projeto e clique em **Publicar**.
4. Na aba **Dados**, crie a coleção `authorizedUsers`.
5. Use seu **UID do Authentication como ID do documento**, não o e-mail.
6. Adicione o campo `enabled`, tipo **boolean**, valor **true**.
7. Repita para o outro usuário autorizado, se houver. Não coloque senhas, e-mails ou saldos nessa lista.

O administrador gerencia a lista pelo Console. O aplicativo não possui privilégios para alterá-la. Para revogar um usuário, mude `enabled` para `false` e desative a conta no Authentication.

## 5. Conecte o projeto local

Copie `.env.example` para `.env` na raiz do projeto. Preencha:

```dotenv
VITE_FIREBASE_API_KEY=cole_o_apiKey_publico
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projectId
VITE_FIREBASE_APP_ID=cole_o_appId
VITE_BASE_PATH=/
VITE_USE_EMULATORS=false
```

Em Authentication → Configurações → Domínios autorizados, adicione `localhost` se não estiver listado. Para testes em `127.0.0.1`, adicione esse domínio também, quando aceito pelo Console; prefira `localhost` no navegador.

Pare o Vite com `Ctrl+C` e execute `npm run dev` novamente. Faça login com o usuário criado. Se receber “sua conta precisa ser autorizada”, confira UID, tipo booleano e nome exato da coleção.

## 6. Cadastre seus primeiros dados reais

1. Abra **Contas** e cadastre seu saldo inicial e a data de referência.
2. Em **Configurações**, informe o dia do salário, despesas essenciais, meses de proteção e margem de segurança.
3. Registre apenas movimentações que ainda não estão incluídas no saldo inicial. O saldo inicial vale para o início da data informada.
4. Registre compromissos futuros como **Previsto**. Confirme-os após conferir o pagamento ou recebimento.
5. Vincule reservas e objetivos a contas existentes. Destinar dinheiro não faz transferência automática nem aumenta patrimônio.
6. Para casal, compartilhe manualmente o UID das configurações e o link de convite. Aceitar o vínculo não publica indicadores privados automaticamente.

## 7. Crie o repositório GitHub

1. Entre no [GitHub](https://github.com/) e crie um repositório novo, por exemplo `finance-hub`.
2. No GitHub Free, a opção habitual para Pages gratuito é um **repositório público**. O código-fonte e o endereço do app serão públicos; os dados financeiros continuam no Firestore sob autenticação. Confira as condições atuais antes de escolher outro plano.
3. Não marque a criação de README/licença/gitignore, pois o projeto já possui esses arquivos.
4. Na pasta do projeto, execute os comandos abaixo, substituindo `SEU_USUARIO` e o nome do repositório:

```powershell
git add .
git commit -m "Implement Finance Hub"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/finance-hub.git
git push -u origin main
```

Antes de `git add`, confira `git status`. `.env`, `node_modules`, `.tools`, arquivos de build e resultados dos testes estão ignorados. Não adicione extratos, backups ou credenciais manualmente. O GitHub pode solicitar que você faça login.

## 8. Configure as variáveis e o GitHub Pages

1. No repositório, abra **Settings → Secrets and variables → Actions → Variables**.
2. Crie quatro **Repository variables**: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, com os mesmos campos públicos do `.env`.
3. Não coloque senhas nem chaves privadas nessas variáveis: qualquer `VITE_*` usado no build pode ser lido no navegador.
4. Em **Settings → Pages**, escolha **GitHub Actions** como origem de publicação.
5. Em **Actions**, abra **Validate and deploy Finance Hub** e execute **Run workflow** na branch `main`.
6. O pipeline instalará dependências, rodará testes financeiros, testes de regras e testes de navegador. Só publicará depois que passarem.
7. O endereço final aparecerá no ambiente `github-pages`, normalmente `https://SEU_USUARIO.github.io/finance-hub/`.
8. No Firebase Authentication → Domínios autorizados, adicione `SEU_USUARIO.github.io` (sem caminho ou `https://`).

O workflow ajusta o `base` para o nome do repositório. Para um repositório especial `SEU_USUARIO.github.io` ou domínio próprio, siga a exceção em DEPLOYMENT.md.

## 9. Confira no celular

Abra o endereço publicado, faça login e registre um valor pequeno de teste. Confira se aparece ao sair e entrar novamente. Teste também com o segundo usuário para confirmar a separação. Depois exclua o registro de teste pela interface.

Android: use a opção de instalar do navegador. iPhone/Safari: **Compartilhar → Adicionar à Tela de Início**. Os registros financeiros exigem internet; o PWA guarda o shell estático, sem cache das respostas privadas do Firestore.

## 10. Acompanhe uso e backups

No Console Firebase, confira **Firestore → Uso**. A cota gratuita consultada é de 50 mil leituras, 20 mil gravações e 20 mil exclusões por dia, 1 GiB armazenado e 10 GiB de saída por mês, para um banco elegível. Regras de acesso também podem consumir leituras. O contador do aplicativo é apenas uma estimativa da sessão.

Mantenha o Spark e exporte um backup criptografado em **Relatórios e backup**. Guarde a senha em local seguro; ela não é recuperável pelo aplicativo.

Se algo falhar, consulte [FIREBASE_SETUP.md](FIREBASE_SETUP.md), [DEPLOYMENT.md](DEPLOYMENT.md) e [TESTING.md](TESTING.md). Não ative faturamento para tentar resolver uma cota.
