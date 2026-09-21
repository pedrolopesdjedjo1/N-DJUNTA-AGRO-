# Módulo de Administração — AgroConecta GB

Painel para o time gestor da plataforma: números gerais, lista de usuários
(com opção de desativar contas problemáticas) e lista de produtos (com
opção de remover anúncios inadequados).

Só usuários com perfil `ADMIN` conseguem acessar essas rotas — qualquer
outro perfil recebe erro de acesso negado.

## Arquivos NOVOS deste módulo
- `src/middleware/isAdmin.ts` — verifica se quem está logado é administrador
- `src/services/adminService.ts`
- `src/controllers/adminController.ts`
- `src/routes/adminRoutes.ts`

## Arquivo que foi EDITADO neste módulo
- `src/server.ts` — ligadas as novas rotas de administração
  (não precisou editar o `schema.prisma` neste módulo)

## Como testar depois de rodar
(Todas as rotas abaixo exigem login com um usuário que tenha `role: "ADMIN"`)
- `GET /api/admin/stats` — números gerais: total de usuários, produtos, mensagens
- `GET /api/admin/users` — lista todos os usuários da plataforma
- `PATCH /api/admin/users/:userId/active` — ativa/desativa uma conta
  ```json
  { "isActive": false }
