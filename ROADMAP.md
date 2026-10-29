# Estado real da entrega e evolução

Esta versão possui módulos integrados e operacionais, com persistência Firebase preparada e testes locais. Não foi publicada, não tem um projeto Firebase real configurado e não satisfaz todos os critérios do documento original. Os critérios de produção permanecem abertos até a configuração e validação pelo proprietário.

## Fundação e gestão

Implementados: React/Vite/Tailwind, layout mobile, sessão/autorização, regras restritivas, PWA, workflow; contas, receitas/despesas, transferências, ajustes, categorias personalizadas, buscas/filtros, recorrências previstas, cartões/parcelas/faturas/pagamentos parciais, orçamento e fechamento mensal.

Faltam: subcategorias com hierarquia, histórico imutável de cada edição/exclusão, séries de recorrência editáveis após criação, conciliação assistida de duas linhas bancárias, cancelamento de parcelas sem recriar grupo, crédito excedente/antecipação de fatura e política completa de renegociação.

## Planejamento

Implementados: reservas/objetivos por conta, destinações sem dupla contagem, cálculos de meta/aporte/prazo, conflito entre objetivos, patrimônio, contas de investimento com atualização manual, projeção conservadora e simuladores de reserva/objetivo/viagem/investimentos/parcelamento/veículo/dívida.

Faltam: cadastro estruturado de cada classe de ativo com quantidade/preço médio/taxa/vencimento/liquidez, lotes e rentabilidade líquida, histórico patrimonial diário/mensal persistido, múltiplos calendários de recebimento, projeção detalhada dia a dia e custos contratuais completos de dívidas/financiamentos.

## Inteligência

Implementados: classificação explicável sem score arbitrário, confiança por suficiência/atualização, alertas de vencimentos/orçamento/reserva/projeção, marcação de lidos e adiamento, relatórios e exportações com consentimento.

Faltam: critérios de saúde inteiramente configuráveis, tendências estatísticas de três meses, detecção de aumentos e objetivos atrasados com análise contextual completa, histórico longitudinal de saúde e preferências por categoria de alerta. O gráfico mensal deriva dos registros; não é uma série patrimonial persistida.

## Recursos avançados

Implementados: convites UID-específicos com expiração, aceite/recusa, vínculo bilateral único e revogação; indicadores qualitativos opt-in; metas compartilhadas e contribuições declaradas; importação CSV/OFX/XLSX/PDF textual restrito, mapeamento, prévia e fingerprints; backup versionado com integridade/AES-GCM e restauração com sobrescrita opcional.

Faltam: cancelamento de convite enviado pela interface (as regras permitem cancelar), edição/arquivamento e correção de contribuições conjuntas (imutáveis nesta versão), simulação avançada compartilhada, reconhecimento amplo de layouts bancários/PDF, OCR, importação de fatura com competência/parcelas automaticamente reconciliadas, relatório persistido de cada lote de importação e exportação seletiva de backup por módulo. O hash é por transação; não há registro do arquivo inteiro como importado.

## Produção

Preparados: regras/testes emulador, build estático com HashRouter/base, manifest/service worker/ícones, GitHub Actions e documentação de configuração do zero.

Dependências externas pendentes: criar projeto Firebase e usuários, publicar regras, configurar domínio e variáveis, criar repositório, executar Actions e validar URL real. Essas ações não foram realizadas em contas do usuário.

Também pendentes: App Check opcional, revisão CSP e hospedagem/termos, testes reais Safari/iOS/Android e teclado virtual, experiência de atualização PWA em aparelhos, testes de carga e auditoria independente. Não há serviço de monitoramento global de quota; o Console Firebase permanece necessário.

## Aceitação

- [x] Código implementado, modular e executável localmente.
- [x] Build de produção local.
- [x] Regras de isolamento e consentimento com testes no Firestore Emulator.
- [x] Duas sessões reais no Authentication Emulator.
- [x] Fluxos principais automatizados em resoluções desktop/mobile.
- [x] Guia para criar Firebase e GitHub do zero.
- [ ] Banco/auth de produção configurados e validados.
- [ ] GitHub Pages publicado e validado em URL final.
- [ ] Instalação/atualização em aparelhos físicos.
- [ ] Todos os recursos avançados do escopo original.

Não usar o aplicativo como única fonte para decisões ou registros até conferir os cálculos e o armazenamento com seus próprios dados e backups. Esta observação reflete limitações concretas da versão, não uma promessa de funcionamento completo.
