# Módulo de Favoritos — AgroConecta GB

Permite ao comprador salvar produtos para ver ou comprar depois, sem perder
de vista o que interessou.

## Arquivos NOVOS deste módulo
- `src/services/favoriteService.ts`
- `src/controllers/favoriteController.ts`
- `src/routes/favoriteRoutes.ts`

## Arquivos que foram EDITADOS neste módulo
- `prisma/schema.prisma` — adicionado o modelo de Favorito
- `src/server.ts` — ligadas as novas rotas de favoritos

## Como testar depois de rodar
- `POST /api/favorites` — favorita um produto (precisa estar logado)
  ```json
  { "productId": "id-do-produto" }
