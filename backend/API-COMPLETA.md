# AgroConecta GB — API Completa

Guia de referência com todas as rotas do backend, organizadas por módulo.
Use este arquivo como checklist ao testar o projeto rodando pela primeira vez.

Legenda: 🔓 pública (sem login) | 🔒 exige login | 👑 exige perfil ADMIN |
🏛️ exige ADMIN/GOVERNO/ONG

## Autenticação (`/api/auth`)
- 🔓 `POST /register` — cria conta
- 🔓 `POST /login` — entra na conta

## Produtos (`/api/products`)
- 🔓 `GET /` — lista produtos
- 🔓 `GET /:id` — vê um produto
- 🔒 `POST /` — cria produto
- 🔒 `PUT /:id` — edita produto (dono)
- 🔒 `DELETE /:id` — remove produto (dono)

## Mensagens (`/api/messages`)
- 🔒 `POST /` — envia mensagem
- 🔒 `GET /` — lista conversas
- 🔒 `GET /with/:otherUserId` — vê conversa
- 🔒 `PATCH /:id/read` — marca como lida

## Avaliações (`/api/reviews`)
- 🔒 `POST /` — cria avaliação
- 🔓 `GET /user/:userId` — vê avaliações de alguém

## Notificações (`/api/notifications`)
- 🔒 `GET /` — lista notificações
- 🔒 `GET /unread-count` — conta não lidas
- 🔒 `PATCH /:id/read` — marca uma como lida
- 🔒 `PATCH /read-all` — marca todas como lidas

## Perfil Público (`/api/profile`)
- 🔓 `GET /:userId` — perfil + produtos + avaliações

## Busca (`/api/search`)
- 🔓 `GET /products` — busca com filtros (query, category, location, minPrice, maxPrice, sortBy)

## Favoritos (`/api/favorites`)
- 🔒 `GET /` — lista favoritos
- 🔒 `POST /` — favorita produto
- 🔒 `DELETE /:productId` — remove favorito

## Admin (`/api/admin`)
- 👑 `GET /stats` — números gerais
- 👑 `GET /users` — lista usuários
- 👑 `PATCH /users/:userId/active` — ativa/desativa conta
- 👑 `GET /products` — lista todos os produtos
- 👑 `DELETE /products/:productId` — remove produto

## Denúncias (`/api/reports`)
- 🔒 `POST /` — cria denúncia
- 👑 `GET /` — lista denúncias
- 👑 `PATCH /:id/status` — atualiza status

## Preços de Mercado (`/api/market-prices`)
- 🔓 `GET /` — média por categoria
- 🔓 `GET /:category/by-location` — média por região

## Transporte (`/api/transport`)
- 🔓 `GET /` — lista ofertas de frete
- 🔒 `POST /` — cria oferta
- 🔒 `PUT /:id` — edita (dono)
- 🔒 `DELETE /:id` — remove (dono)

## Pagamentos (`/api/payments`)
- 🔒 `POST /` — registra pagamento
- 🔒 `GET /` — lista meus pagamentos
- 🔒 `PATCH /:id/confirm` — vendedor confirma
- 🔒 `PATCH /:id/cancel` — cancela

## Idiomas (`/api/translations`)
- 🔓 `GET /` — traduções (padrão português)
- 🔓 `GET /?lang=crioulo` — traduções em crioulo
- 👑 `POST /` — cadastra/corrige tradução
- 🔒 `PATCH /my-language` — troca idioma preferido

## SMS/Offline (`/api/sms`)
- 🔓 `POST /incoming` — simula SMS recebido
- 👑 `GET /logs` — histórico de SMS

## Dashboard (`/api/dashboard`)
- 🏛️ `GET /overview` — visão geral
- 🏛️ `GET /growth` — crescimento de usuários

## Verificação (`/api/verifications`)
- 🔒 `POST /` — pede verificação
- 👑 `GET /` — lista pedidos
- 👑 `PATCH /:id/review` — aprova/rejeita

## Clima/Alertas (`/api/weather-alerts`)
- 🔓 `GET /` — lista alertas ativos
- 🏛️ `POST /` — publica alerta
- 🏛️ `DELETE /:id` — remove alerta

## Cooperativas (`/api/cooperatives`)
- 🔓 `GET /` — lista cooperativas
- 🔓 `GET /:id` — detalhes + membros
- 🔒 `POST /` — cria cooperativa (você vira líder)
- 🔒 `POST /:id/join` — entra como membro
- 🔒 `DELETE /:id/leave` — sai da cooperativa

---

## Roteiro para testar no computador

1. `git clone` (ou baixe) o repositório
2. `cd backend`
3. `npm install`
4. `cp .env.example .env` e edite com seu `DATABASE_URL` e `JWT_SECRET` reais
5. `npx prisma migrate dev --name init` — isso cria todas as tabelas no Supabase
   de uma vez, a partir de tudo que está no `schema.prisma`
6. `npm run dev`
7. Se der erro, leia a mensagem com calma — ela quase sempre aponta o arquivo
   e a linha exata do problema. Erros comuns nessa fase:
   - Vírgula faltando ou sobrando em algum arquivo colado
   - Um `import` apontando para um arquivo com nome diferente
   - Alguma edição do `schema.prisma` ou `server.ts` que ficou incompleta
8. Teste a rota `GET /` primeiro — se aparecer `{"status": "AgroConecta GB
   API rodando"}`, o servidor básico está de pé
9. Vá testando módulo por módulo, na ordem deste documento, com o Postman,
   Insomnia, ou até o `curl` do terminal
