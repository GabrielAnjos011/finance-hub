# Modelo de dados — versão 1

Todos os documentos privados possuem `ownerUid`, `schemaVersion: 1` e `revision` inteira crescente. O ID do documento é exposto em memória como `id`, sem repetir esse campo no documento. Schemas de cliente em `src/services/models.js` e validação independente nas regras.

| Caminho                                      | Campos principais                                                                                                                                                            | Significado                                                                       |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `authorizedUsers/{uid}`                      | `enabled: boolean`                                                                                                                                                           | Administrado apenas no Console; não contém finanças                               |
| `users/{uid}/accounts/{id}`                  | `name, institution, kind, initialCents, referenceDate, purpose, spendable, includeInWealth`                                                                                  | Saldo calculado pelo razão; tipos checking/payment/cash/reserve/investment/linked |
| `users/{uid}/transactions/{id}`              | `description, amountCents, type, date, competence, dueDate, status, category, accountId, destinationId, cardId, groupId, installment, installments, tags, notes, recurrence` | Movimentações confirmadas e previsões                                             |
| `users/{uid}/cards/{id}`                     | `name, institution, limitCents, closingDay, dueDay, accountId, active`                                                                                                       | Parâmetros manuais de cartão, sem número/CVV                                      |
| `users/{uid}/budgets/{id}`                   | `month, category, limitCents`                                                                                                                                                | Limite mensal por categoria                                                       |
| `users/{uid}/funds/{id}`                     | `name, purpose, accountId, allocatedCents, targetCents, monthlyCents`                                                                                                        | Dinheiro existente destinado a reserva ou provisão                                |
| `users/{uid}/goals/{id}`                     | `name, targetCents, savedCents, monthlyCents, deadline, priority, description, accountId`                                                                                    | Alocação e plano individual                                                       |
| `users/{uid}/settings/preferences`           | `name, salaryDay, essentialCents, reserveMonths, safetyCents, monthlyContributionCents, donationPercent, theme, categories, notifications, updatedDate`                      | Preferências e premissas pessoais                                                 |
| `users/{uid}/closures/{YYYY-MM}`             | `month, closed, incomeCents, expenseCents, events[]`                                                                                                                         | Conferência e histórico de fechamento/reabertura                                  |
| `users/{uid}/alertStates/{alertId}`          | `read, snoozeUntil`                                                                                                                                                          | Estado de alertas calculados localmente                                           |
| `invites/{uuid}`                             | `senderUid, recipientUid, expiresAt: Timestamp, state`                                                                                                                       | Convite direcionado, não enumerável                                               |
| `memberships/{uid}`                          | `coupleId`                                                                                                                                                                   | Lock para um único vínculo ativo                                                  |
| `couples/{inviteId}`                         | `memberA, memberB, status`                                                                                                                                                   | Relacionamento bilateral                                                          |
| `couples/{id}/indicators/{uid}`              | `consent, health, reserve, organization, commitment, updatedDate`                                                                                                            | Somente rótulos qualitativos predefinidos                                         |
| `couples/{id}/goals/{id}`                    | `name, targetCents, deadline, createdBy, revision`                                                                                                                           | Meta declarada compartilhada                                                      |
| `couples/{id}/goals/{id}/contributions/{id}` | `uid, amountCents, date`                                                                                                                                                     | Aporte declarado compartilhado, imutável nesta versão                             |

## Convenções

- Datas civis: `YYYY-MM-DD`; meses: `YYYY-MM`. A data corrente é obtida em `America/Sao_Paulo`, evitando interpretar datas civis como UTC.
- Moeda: BRL, inteiros de centavos, limite por campo de 100 bilhões de centavos. Não há conversão cambial automática.
- Tipos de movimentação: `income`, `expense`, `transfer`, `card_purchase`, `card_payment`, `refund`, `adjustment`.
- Valores positivos, exceto ajuste de saldo, que pode ser negativo. Estorno é do cartão e tem valor positivo; seu efeito na despesa e obrigação é negativo.
- `confirmed` significa verificado pelo usuário. `planned` nunca altera saldo efetivo nem obrigação confirmada.
- Investimento é uma conta do tipo `investment`. Posição atual não é somada outra vez por um documento separado.
- Reservas e objetivos são destinações do saldo da conta. O formulário impede destinações acima do saldo, mas um gasto posterior pode reduzir a cobertura: conferir saldos é necessário.
- Parcelas têm um mesmo `groupId`, números de parcela e valores cuja soma é exatamente o total da compra. `date` preserva a data da compra; `competence` e `dueDate` variam.

## Consultas e índices

O repositório privado consulta somente `users/{uid}/{module}`, com `orderBy('__name__')`, `limit(200)` e cursor. Os filtros financeiros são locais para manter coerência do saldo completo. Não se usa collection group. Os índices automáticos bastam para as consultas atuais, por isso `firestore.indexes.json` possui uma lista de índices compostos vazia. Ao adicionar consultas por período, declarar e testar novos índices antes de publicar.

Convites são lidos por ID conhecido pelos participantes. Coleções de indicadores não permitem listagem: cada indicador é lido pelo UID explícito e consentimento vigente. Objetivos compartilhados são listados somente pelos membros de um vínculo ativo.

## Backup

Envelope JSON `format: finance-hub`, `version: 1`, `createdAt`, `data`, `checksum` SHA-256. O checksum detecta corrupção acidental; sozinho não comprova autoria. O envelope cifrado usa `finance-hub-encrypted`, PBKDF2-SHA256/310.000 iterações, salt aleatório de 16 bytes e AES-GCM com IV aleatório de 12 bytes. A autenticação criptográfica detecta adulteração sem a senha.

IDs são preservados na restauração, mas `ownerUid` é sempre substituído pelo usuário autenticado. Não se restauram autorizações nem documentos do casal. Sobrescrita é opcional e explícita. Restaurações são feitas por módulos/lotes e podem ser repetidas após falha; IDs existentes são preservados por padrão.
