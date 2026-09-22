# Módulo de Cooperativas — NôdjuntaAgro GB

Permite que agricultores/pescadores se juntem em cooperativas por região,
ganhando mais força de negociação. Quem cria a cooperativa vira o líder
automaticamente.

## Arquivos NOVOS deste módulo
- `src/services/cooperativeService.ts`
- `src/controllers/cooperativeController.ts`
- `src/routes/cooperativeRoutes.ts`

## Arquivos que foram EDITADOS neste módulo
- `prisma/schema.prisma` — adicionados os modelos de Cooperativa e Membro
- `src/server.ts` — ligadas as novas rotas de cooperativas

## Como testar depois de rodar
- `POST /api/cooperatives` — cria uma cooperativa (você vira o líder,
  precisa estar logado)
  ```json
  {
    "name": "Cooperativa dos Agricultores de Bafatá",
    "description": "Grupo de pequenos produtores de arroz e milho",
    "region": "Bafatá"
  }
