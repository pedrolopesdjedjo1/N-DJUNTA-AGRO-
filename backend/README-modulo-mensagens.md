# Módulo de Mensagens — NôdjuntaAgro GB

Permite que comprador e vendedor conversem diretamente no app sobre um produto.

## Arquivos NOVOS deste módulo
- `src/services/messageService.ts`
- `src/controllers/messageController.ts`
- `src/routes/messageRoutes.ts`

## Arquivos que foram EDITADOS neste módulo
- `prisma/schema.prisma` — adicionado o modelo de Mensagem
- `src/server.ts` — ligadas as novas rotas de mensagem

## Como testar depois de rodar
- `POST /api/messages` — envia uma mensagem (precisa estar logado)
  ```json
  {
    "receiverId": "id-do-outro-usuario",
    "productId": "id-do-produto (opcional)",
    "content": "Olá, o arroz ainda está disponível?"
  }
