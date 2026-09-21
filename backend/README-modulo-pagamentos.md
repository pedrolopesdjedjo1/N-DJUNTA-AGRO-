# Módulo de Pagamentos — NôdjuntaAgro GB

Registra como uma negociação foi paga (dinheiro na entrega, transferência
bancária, mobile money). **Importante: este módulo NÃO processa pagamento
real** — não mexe com dinheiro de verdade, é apenas um registro/histórico
para ambas as partes terem prova da negociação e para relatórios futuros.

## Arquivos NOVOS deste módulo
- `src/services/paymentService.ts`
- `src/controllers/paymentController.ts`
- `src/routes/paymentRoutes.ts`

## Arquivos que foram EDITADOS neste módulo
- `prisma/schema.prisma` — adicionado o modelo de Pagamento
- `src/server.ts` — ligadas as novas rotas de pagamento

## Como testar depois de rodar
- `POST /api/payments` — registra um pagamento (o comprador cria, precisa
  estar logado)
  ```json
  {
    "sellerId": "id-do-vendedor",
    "productId": "id-do-produto (opcional)",
    "amount": 5000,
    "method": "MOBILE_MONEY",
    "notes": "Pago via Orange Money"
  }
