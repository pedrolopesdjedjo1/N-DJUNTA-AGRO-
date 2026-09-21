# Módulo de Avaliações — AgroConecta GB

Permite que os usuários avaliem uns aos outros (de 1 a 5 estrelas) depois de
uma negociação, construindo confiança na plataforma.

## Arquivos NOVOS deste módulo
- `src/services/reviewService.ts`
- `src/controllers/reviewController.ts`
- `src/routes/reviewRoutes.ts`

## Arquivos que foram EDITADOS neste módulo
- `prisma/schema.prisma` — adicionado o modelo de Avaliação
- `src/server.ts` — ligadas as novas rotas de avaliação

## Como testar depois de rodar
- `POST /api/reviews` — cria uma avaliação (precisa estar logado)
  ```json
  {
    "targetId": "id-do-usuario-avaliado",
    "productId": "id-do-produto (opcional)",
    "rating": 5,
    "comment": "Produto de ótima qualidade, entrega rápida."
  }
