# Regras financeiras

## Saldos e patrimônio

`saldo da conta = saldo inicial + receitas + ajustes + transferências recebidas − despesas − transferências enviadas − pagamentos de fatura`.

Somente registros confirmados, na data ou após a referência da conta e até a data atual, alteram esse saldo. O saldo inicial representa o começo do dia de referência: não importe novamente movimentos que já estavam incluídos nele. Compras/estornos de cartão alteram obrigação, não caixa bancário.

`patrimônio financeiro = soma das contas incluídas no patrimônio − obrigações em aberto dos cartões`.

Não representa patrimônio imobiliário/veículos/passivos não cadastrados. Reservas e objetivos não são somados aos ativos. Transferências próprias conservam o patrimônio. Investimentos são contas; o valor atual é o saldo calculado da conta e não uma posição adicional duplicada.

`dinheiro livre = saldos das contas marcadas disponíveis − destinações dessas contas para fundos/objetivos`, limitando a proteção ao saldo positivo efetivamente existente. Contas protegidas não entram como dinheiro livre, mesmo que façam parte do patrimônio. Saldos negativos de contas livres reduzem a disponibilidade.

## Receitas, despesas e cartão

O saldo do período é receitas confirmadas menos despesas reconhecidas. Transferência, ajuste de avaliação e pagamento de fatura não são receitas/despesas. Despesas bancárias usam a data civil; compras parceladas e estornos usam a competência da fatura.

Política de cartão: reconhecer despesas por parcela na competência da fatura. A compra total não é gravada como despesa adicional. O limite estimado considera todas as parcelas confirmadas ainda não pagas. Compra no dia do fechamento entra no fechamento seguinte. Vencimento igual ou anterior ao dia de fechamento fica no mês seguinte; dias inexistentes são limitados ao último dia do mês. A política é explícita e pode diferir do processamento real do banco; confira a fatura.

Parcelamento divide inteiros, distribuindo o resíduo de um centavo nas primeiras parcelas. Total de parcelas limitado a 120. Parcelamento e recorrência não são combinados no mesmo formulário. Para alterar compra parcelada, exclua o grupo e cadastre novamente; não se redivide somente uma parcela. A exclusão de grupo exige confirmação e respeita meses fechados.

Pagamentos de fatura reduzem o saldo da conta e a obrigação da competência selecionada, sem repetir a despesa. Pagamentos parciais são permitidos. Estornos reduzem despesa e obrigação. Crédito excedente de cartão, antecipação de parcelas, renegociação e cálculo automático de juros não estão modelados; não use sobrepagamento para simular crédito bancário. Juros/multas devem ser registrados manualmente com a competência correta.

## Previsão e ciclo

`disponível estimado até o salário = dinheiro livre atual − despesas previstas e transferências para contas protegidas até o próximo salário − faturas em aberto com vencimento até essa data − margem de segurança`.

Inclui pendências vencidas. Transferências entre duas contas livres não reduzem o conjunto disponível. Receitas futuras, incluindo salário, não são antecipadas como caixa existente. O salário de hoje já pertence ao ciclo atual; a próxima data é no mês seguinte. Recebimentos variáveis futuros não aumentam automaticamente a estimativa.

A previsão pode ficar negativa: o déficit é mostrado, não ocultado. Só é tão confiável quanto os dados informados; despesas ainda não cadastradas não são adivinhadas. Configure previsões essenciais manualmente. A confiança é baixa sem contas, renda confirmada no período, despesas essenciais ou revisão há mais de 45 dias.

Mês calendário, ano, intervalo personalizado e ciclo de salário são filtros distintos. Orçamentos e fechamento permanecem mensais, mesmo quando outro intervalo está selecionado. A saúde depende da renda/despesa do filtro; filtros incompletos podem produzir classificação insuficiente.

## Recorrência e conferência

Ao cadastrar uma recorrência, somente a primeira ocorrência pode ser confirmada. As demais são previsões mensais (até 24). Meses curtos preservam o último dia possível. Ocorrências não são criadas em segundo plano: não existe tarefa paga ou servidor contínuo. O usuário confirma cada ocorrência após verificar a movimentação real.

Fechar um mês guarda totais e um evento. As regras do Firestore impedem criar, alterar ou excluir lançamentos afetando meses fechados. A reabertura preserva eventos e exige confirmação. Isso não é um livro contábil certificado; o proprietário pode reabrir e corrigir seus próprios dados.

## Reservas, objetivos e investimentos

Reserva é uma alocação em uma conta existente. O indicador de emergência é limitado ao saldo de cada conta, inclusive quando há mais de um fundo nela. Não há “dinheiro adicional”. O formulário considera somadas as destinações de reservas e objetivos e impede ultrapassar o saldo no momento da gravação.

`meta pessoal de emergência = despesas essenciais mensais × meses escolhidos`.

`meses de cobertura = reserva atual / despesas essenciais`.

`aporte mensal de objetivo sem rendimento = teto((meta − acumulado) / meses restantes)`.

Planos vencidos usam um mês como prazo mínimo para explicitar o esforço necessário, sem prazo negativo. Conflito: soma de aportes necessários dos objetivos acima da capacidade mensal informada. Alterar um plano não cria movimentação real.

Para investimento, aporte/resgate é uma transferência entre contas próprias. Avaliação manual é um ajuste pela diferença, sem classificá-la automaticamente como rendimento recebido. Não há cotação inventada, tributação ou promessa de retorno. O campo finalidade pode registrar a classe do ativo, mas não substitui controle de lotes e preço médio.

## Saúde e simuladores

Saúde: dados insuficientes; risco se projeção ou saldo do período for negativo; atenção se reserva menor que a meta pessoal ou despesas acima de 85% da renda; saudável caso contrário. 85% é um parâmetro educativo desta versão, não uma regra universal, e ainda não é configurável pela interface. Sem pontuação arbitrária ou certificação.

Simuladores executados localmente: reserva, objetivo/viagem, acumulação com juros compostos, parcelas sem juros, custo de veículo e amortização com juros mensais. Todos mostram premissas e não gravam resultados como dinheiro existente. Taxas são mensais hipotéticas. Poder de compra usa inflação mensal informada. O modelo de dívida não substitui contrato/SAC/Price com tarifas e seguros.
