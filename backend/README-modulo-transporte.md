# Módulo de Transporte/Logística — NôdjuntaAgro GB

Permite que transportadores anunciem frete disponível (rota, capacidade,
preço, data) para levar produtos do vendedor até o comprador.

## Arquivos NOVOS deste módulo
- `src/services/transportService.ts`
- `src/controllers/transportController.ts`
- `src/routes/transportRoutes.ts`

## Arquivos que foram EDITADOS neste módulo
- `prisma/schema.prisma` — adicionado o modelo de Oferta de Transporte
- `src/server.ts` — ligadas as novas rotas de transporte

## Como testar depois de rodar
- `POST /api/transport` — cria uma oferta de frete (precisa estar logado,
  normalmente um usuário com perfil TRANSPORTADOR)
  ```json
  {
    "origin": "Bissau",
    "destination": "Bafatá",
    "capacity": "1 tonelada",
    "price": 5000,
    "availableDate": "2026-10-01",
    "notes": "Caminhão com cobertura, saída pela manhã"
  }
