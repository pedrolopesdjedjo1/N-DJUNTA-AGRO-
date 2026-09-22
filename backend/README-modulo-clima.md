# Módulo de Clima/Alertas Agrícolas — NôdjuntaAgro GB

Permite que governo, ONGs e administradores publiquem avisos por região
sobre chuva forte, seca, pragas ou outros riscos, para ajudar o
agricultor/pescador a se planejar. Qualquer pessoa pode ver os alertas,
sem precisar de login.

## Arquivos NOVOS deste módulo
- `src/services/weatherAlertService.ts`
- `src/controllers/weatherAlertController.ts`
- `src/routes/weatherAlertRoutes.ts`

## Arquivos que foram EDITADOS neste módulo
- `prisma/schema.prisma` — adicionado o modelo de Alerta
- `src/server.ts` — ligadas as novas rotas de alertas

## Como testar depois de rodar
- `POST /api/weather-alerts` — publica um alerta (só governo, ONG ou admin)
  ```json
  {
    "region": "Bafatá",
    "type": "CHUVA",
    "severity": "ALTA",
    "title": "Chuvas fortes previstas",
    "description": "Chuvas fortes esperadas nos próximos 3 dias, risco de enchente em áreas baixas.",
    "expiresAt": "2026-10-05"
  }
