# Módulo de Busca Avançada — NôdjuntaAgro GB

Permite ao comprador procurar produtos combinando palavra-chave, categoria,
região, faixa de preço e ordenação. Não cria tabela nova — usa os produtos
que já existem.

## Arquivos NOVOS deste módulo
- `src/services/searchService.ts`
- `src/controllers/searchController.ts`
- `src/routes/searchRoutes.ts`

## Arquivo que foi EDITADO neste módulo
- `src/server.ts` — ligada a nova rota de busca
  (não precisou editar o `schema.prisma` neste módulo)

## Como testar depois de rodar
- `GET /api/search/products` — lista todos os produtos disponíveis
- `GET /api/search/products?query=arroz` — busca por palavra-chave no título/descrição
- `GET /api/search/products?category=AGRICOLA` — filtra por categoria
- `GET /api/search/products?location=Bissau` — filtra por região
- `GET /api/search/products?minPrice=100&maxPrice=1000` — filtra por faixa de preço
- `GET /api/search/products?sortBy=price_asc` — ordena do mais barato ao mais caro
  (`sortBy` aceita: `recent`, `price_asc`, `price_desc`)
- Todos os filtros podem ser combinados na mesma busca

## Próximo módulo sugerido
Favoritos (comprador salva produtos para ver depois).
