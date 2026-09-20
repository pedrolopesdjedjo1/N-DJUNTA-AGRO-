# Módulo de Autenticação — NôdjuntaAgro GB

Este é o primeiro módulo do backend: cadastro e login de usuários, com suporte
aos diferentes perfis do app (agricultor, pescador, comprador, comerciante,
agente digital, transportador, governo, ONG).

## Arquivos deste módulo
- `prisma/schema.prisma` — modelo do usuário no banco de dados
- `src/services/authService.ts` — regras de negócio (criar conta, logar)
- `src/controllers/authController.ts` — recebe os pedidos da API
- `src/routes/authRoutes.ts` — define os endereços (endpoints) da API
- `src/middleware/auth.ts` — protege rotas que exigem login
- `src/utils/jwt.ts` — cria e valida o "crachá digital" (token) do usuário
- `src/server.ts` — arquivo que liga tudo e inicia o servidor

## Como rodar (quando tiver um computador por perto)
```bash
cd backend
npm install
cp .env.example .env
# edite o .env com os dados reais do seu banco PostgreSQL
npx prisma migrate dev --name init
npm run dev
