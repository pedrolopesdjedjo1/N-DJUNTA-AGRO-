# Módulo de Notificações — AgroConecta GB

Guarda avisos para o usuário (ex: "você recebeu uma mensagem nova",
"alguém te avaliou"). Neste módulo o sistema de notificações fica pronto
para uso; conectar automaticamente com os módulos de mensagens e avaliações
é um passo futuro simples (chamar `createNotification` dentro deles).

## Arquivos NOVOS deste módulo
- `src/services/notificationService.ts`
- `src/controllers/notificationController.ts`
- `src/routes/notificationRoutes.ts`

## Arquivos que foram EDITADOS neste módulo
- `prisma/schema.prisma` — adicionado o modelo de Notificação
- `src/server.ts` — ligadas as novas rotas de notificação

## Como testar depois de rodar
- `GET /api/notifications` — lista todas as notificações do usuário logado
- `GET /api/notifications?unread=true` — lista só as não lidas
- `GET /api/notifications/unread-count` — conta quantas não foram lidas
- `PATCH /api/notifications/:id/read` — marca uma como lida
- `PATCH /api/notifications/read-all` — marca todas como lidas

## Próximo módulo sugerido
Perfil público (página que mostra os dados, produtos e avaliações de um usuário).
