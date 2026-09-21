# Módulo de Denúncias — NôdjuntaAgro GB

Permite que qualquer usuário denuncie um produto ou perfil suspeito
(fraude, produto falso, comportamento abusivo). O admin revisa as
denúncias no painel de administração.

## Arquivos NOVOS deste módulo
- `src/services/reportService.ts`
- `src/controllers/reportController.ts`
- `src/routes/reportRoutes.ts`

## Arquivos que foram EDITADOS neste módulo
- `prisma/schema.prisma` — adicionado o modelo de Denúncia
- `src/server.ts` — ligadas as novas rotas de denúncia

## Como testar depois de rodar
- `POST /api/reports` — cria uma denúncia (precisa estar logado)
  ```json
  {
    "targetType": "PRODUCT",
    "targetId": "id-do-produto-ou-usuario",
    "reason": "Produto anunciado não existe, parece golpe."
  }
