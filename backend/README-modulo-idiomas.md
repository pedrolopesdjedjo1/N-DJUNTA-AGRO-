# Módulo de Idiomas/Localização — NôdjuntaAgro GB

Permite que o app fale português e crioulo da Guiné-Bissau. Os textos fixos
do app (botões, mensagens, títulos) ficam guardados nos dois idiomas, e
cada usuário escolhe qual prefere ver.

## Arquivos NOVOS deste módulo
- `src/services/translationService.ts`
- `src/controllers/translationController.ts`
- `src/routes/translationRoutes.ts`

## Arquivos que foram EDITADOS neste módulo
- `prisma/schema.prisma` — adicionado o modelo de Tradução e o idioma preferido do usuário
- `src/server.ts` — ligadas as novas rotas de idiomas

## Como testar depois de rodar
- `GET /api/translations` — devolve todos os textos em português (padrão)
- `GET /api/translations?lang=crioulo` — devolve todos os textos em crioulo
- `POST /api/translations` — cadastra ou corrige um texto (só admin)
  ```json
  {
    "key": "botao_comprar",
    "portugues": "Comprar",
    "crioulo": "Kunpra"
  }
