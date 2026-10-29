# Segurança e privacidade

## Fronteiras reais

Autenticação identifica o UID; autorização é uma consulta a `authorizedUsers/{uid}` nas Security Rules. O cliente não concede autorização a si mesmo. Um usuário autenticado e não listado não acessa dados financeiros. A rota protegida melhora a experiência, mas não é a fronteira de segurança.

Todas as coleções privadas exigem UID do caminho igual ao autenticado, autorização ativa, proprietário igual ao caminho, schema conhecido, campos permitidos, tipos, limites e revisões crescentes. O acesso desconhecido é negado. Não existe listagem global de usuários, leitura de autorização alheia, mutação administrativa ou troca de proprietário. As regras também bloqueiam alterações de lançamentos em mês fechado.

O dono de um dado pode adulterar seus próprios números: o sistema não é uma auditoria e não usa o indicador como prova de solvência. Schemas não comprovam veracidade financeira.

## Modo casal

1. Remetente autorizado cria um convite para UID específico também autorizado, com expiração de até sete dias na UI (as regras aceitam menos de oito dias).
2. Convite não é enumerável; somente remetente/destinatário leem o documento por ID.
3. O destinatário aceita em uma transação: convite aceito + casal ativo + dois locks `memberships/{uid}`. As regras verificam os estados anteriores e posteriores com `getAfter`/`existsAfter`.
4. Nenhum lock pode existir antes da ativação: isso impede dois vínculos simultâneos.
5. Indicadores são publicados pelo próprio dono, em coleção distinta, com consentimento. O parceiro lê somente rótulos enumerados e data; valores, nomes, percentuais e campos extras são negados.
6. Objetivos conjuntos e contribuições ficam fora dos caminhos privados. Os membros veem nome/meta/prazo e autoria/valor/data das contribuições conforme explicado na UI.
7. Desvincular exige revogar o casal e remover os dois locks na mesma operação. Novas leituras de subcoleções dependem do estado ativo e são negadas imediatamente no servidor após a revogação.

O listener do lock remove o espaço compartilhado da interface ao detectar desvinculação. Revogar publicação individual altera `consent:false`. Dados já vistos, memorizados, fotografados, copiados ou exportados não podem ser apagados do dispositivo de outra pessoa.

## Dados e dispositivos

O SDK usa cache somente em memória. Zustand não é persistido em localStorage. O service worker guarda recursos estáticos e não intercepta respostas Firestore. Dados em memória são descartados no logout e há proteção contra respostas assíncronas de sessões anteriores. Autenticação persistente é opcional; o padrão é sessão do navegador. Evite “manter conectado” em aparelhos compartilhados.

A sessão é revalidada ao voltar à aba. Security Rules continuam valendo mesmo com interface antiga aberta. Uma revogação não pode apagar instantaneamente números já carregados em memória de um navegador desconectado; ela impede novas leituras e gravações no servidor. Não há promessa de remoção remota de arquivos exportados.

React renderiza texto sem HTML arbitrário; não há `dangerouslySetInnerHTML` ou execução de descrições importadas. CSV exportado neutraliza prefixos de fórmulas. Arquivos são processados no dispositivo com limites de tamanho/linhas. PDF.js usa `isEvalSupported:false`; não há OCR nem execução de conteúdo importado.

Relatório para IA não envia dados externamente. Geração/cópia/exportação exigem consentimento explícito e a prévia é revisável. Nomes de bancos, contas e UIDs não entram no resumo. Categorias personalizadas são opcionais porque podem identificar o usuário. Os valores consolidados também podem ser omitidos. Backups completos e exportações de lançamentos são sensíveis e têm autorização própria.

## Criptografia de backup

AES-256-GCM, IV aleatório de 96 bits, salt de 128 bits e PBKDF2-SHA256/310.000 iterações. Senha mínima de 12 caracteres no fluxo cifrado. A senha não é persistida nem enviada ao Firebase. Sem senha não há recuperação. A criptografia é do arquivo exportado; o app não declara criptografia ponta a ponta dos documentos Firestore.

O checksum SHA-256 do envelope JSON sem senha detecta corrupção acidental e não é assinatura de autenticidade. Restauração verifica schema, integridade, IDs e referências. O proprietário importado é substituído pelo UID atual, nunca restaurado como privilégio. Os IDs existentes não são sobrescritos sem escolha explícita.

## Erros e observabilidade

Mensagens de login são genéricas; a recuperação apresenta resposta neutra. Contadores registram operações/códigos sem imprimir descrições, saldos, e-mails, arquivos ou senhas. Não há envio de diagnósticos para serviço externo. O Firebase pode registrar eventos técnicos na própria infraestrutura do serviço.

## Limitações e revisão antes de produção

App Check e política CSP por header ainda não estão configurados. Os cabeçalhos disponíveis dependem da hospedagem. Nenhum teste elimina a necessidade de revisar dependências, regras publicadas e configuração real. Os schemas das regras validam formatos e tipos; o cliente faz validação de datas civis e consistência financeira mais detalhada. Não se usa cálculo do cliente para autorizar acesso de um parceiro.

O aplicativo é tecnicamente estático e usa Firebase diretamente. Os [limites oficiais do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) desaconselham transações sensíveis como envio de senhas e proíbem certas formas de SaaS/comércio. O fluxo envia credenciais ao Firebase, mas isso não resolve por si só a interpretação dos termos da hospedagem. A implantação real no Pages precisa ser avaliada pelo proprietário; Firebase Hosting no Spark é uma alternativa estática a considerar se necessário. O workflow Pages foi preparado conforme solicitado, sem publicação automática nesta entrega.

## Evidências

Na revisão de dependências de 28/10/2026, o leitor XLSX foi substituído por `read-excel-file` e `@grpc/grpc-js` foi fixado em `1.13.6` via override, versão corrigida do [aviso oficial de certificados](https://github.com/advisories/GHSA-m9gg-hp2v-232j). A suíte de emuladores foi repetida após a alteração. `npm audit --omit=dev` retornou zero avisos conhecidos para as dependências de produção nessa consulta; isso não significa ausência de falhas futuras ou cobertura de todas as dependências de desenvolvimento.

`tests/rules/security.test.js` testa A, B, terceiro autorizado, não autorizado e anônimo, schemas, mudança de dono, revisão, mês fechado, convites, locks, consentimento e revogação usando SDK direto no Firestore Emulator. `tests/rules/auth-flow.test.js` usa duas sessões reais no Authentication Emulator para login, lista de autorização e isolamento. As credenciais desse teste são fictícias e restritas ao emulador.
