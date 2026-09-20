# Módulo de Produtos — NôdjuntaAgro GB

Este módulo permite que agricultores, pescadores e comerciantes anunciem
produtos para venda, e que compradores naveguem e vejam esses produtos.

## Arquivos NOVOS deste módulo
- `src/services/productService.ts`
- `src/controllers/productController.ts`
- `src/routes/productRoutes.ts`

## Arquivos que foram EDITADOS neste módulo
- `prisma/schema.prisma` — adicionado o modelo de Produto
- `src/server.ts` — ligadas as novas rotas de produto

## Como testar depois de rodar
- `GET /api/products` — lista todos os produtos disponíveis
- `GET /api/products/:id` — vê um produto específico
- `POST /api/products` — cria um produto (precisa estar logado)
  ```json
  {
    "title": "Sacos de arroz",
    "description": "Arroz colhido este mês",
    "category": "AGRICOLA",
    "price": 500,
    "unit": "saco de 50kg",
    "quantity": 20,
    "location": "Bissau"
  }
