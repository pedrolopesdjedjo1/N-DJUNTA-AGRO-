# Módulo de Taxa da Plataforma — NôdjuntaAgro GB

Permite configurar uma porcentagem de comissão que o AgroConecta GB cobra
sobre cada pagamento registrado. **Começa em 0% (totalmente gratuito)** —
só é cobrado algo se o admin decidir ativar uma porcentagem no futuro.

Quando um pagamento é criado, o sistema já calcula automaticamente:
- `feeAmount` — quanto seria a taxa da plataforma
- `netAmount` — quanto sobra para o vendedor

Isso é só o **registro/cálculo** — não processa cobrança real ainda (isso
vem depois, quando você integrar a API da Orange Money/Mobile Money de
verdade, com as credenciais deles).

## Arquivos NOVOS deste módulo
- `src/services/platformSettingsService.ts`
- `src/controllers/platformSettingsController.ts`
- `src/routes/platformSettingsRoutes.ts`

## Arquivos que foram EDITADOS neste módulo
- `prisma/schema.prisma` — adicionado o modelo de Configurações e os
  campos de taxa no Pagamento
- `src/services/paymentService.ts` — calcula a taxa automaticamente
- `src/server.ts` — ligadas as novas rotas

## Como testar depois de rodar
- `GET /api/platform-settings` — vê a taxa atual (começa em 0%)
- `PATCH /api/platform-settings` — muda a taxa (só admin)
  ```json
  { "commissionPercentage": 3 }
