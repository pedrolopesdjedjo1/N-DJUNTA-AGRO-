# Módulo de Preços de Mercado — NôdjuntaAgro GB

Mostra o preço médio, mínimo e máximo por categoria de produto, e como o
preço varia por região. Ajuda o agricultor/pescador a precificar de forma
justa e o comprador a saber se está pagando um preço razoável.

Este módulo não cria tabela nova — calcula tudo em cima dos produtos que
já existem no banco.

## Arquivos NOVOS deste módulo
- `src/services/marketPriceService.ts`
- `src/controllers/marketPriceController.ts`
- `src/routes/marketPriceRoutes.ts`

## Arquivo que foi EDITADO neste módulo
- `src/server.ts` — ligadas as novas rotas de preços de mercado
  (não precisou editar o `schema.prisma` neste módulo)

## Como testar depois de rodar
- `GET /api/market-prices` — preço médio, mínimo e máximo de cada categoria
  (AGRICOLA, PESCA, ARTESANATO, OUTRO), considerando todas as regiões
- `GET /api/market-prices/AGRICOLA/by-location` — preço médio da categoria
  agrícola, comparando região por região (ex: Bissau vs. Bafatá)

## Próximo módulo sugerido
Transporte/logística (transportadores oferecem frete para levar produtos
do vendedor até o comprador).
