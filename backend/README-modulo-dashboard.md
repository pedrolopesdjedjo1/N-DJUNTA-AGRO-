# Módulo de Dashboard/Relatórios — NôdjuntaAgro GB

Mostra estatísticas gerais da plataforma para governo, ONGs e administradores:
quantos usuários de cada tipo, quantos produtos por categoria e região,
quantas transações confirmadas, crescimento de usuários por mês.

**Privacidade:** todas as informações aqui são números agregados (contagens,
médias) — nunca mostram dados pessoais de um usuário específico, nome,
telefone ou histórico individual.

## Arquivos NOVOS deste módulo
- `src/services/dashboardService.ts`
- `src/controllers/dashboardController.ts`
- `src/routes/dashboardRoutes.ts`

## Arquivo que foi EDITADO neste módulo
- `src/server.ts` — ligadas as novas rotas de dashboard
  (não precisou editar o `schema.prisma` neste módulo)

## Como testar depois de rodar
(Só usuários com perfil `ADMIN`, `GOVERNO` ou `ONG` conseguem acessar)
- `GET /api/dashboard/overview` — visão geral: usuários por perfil, produtos
  por categoria e região, total de transações confirmadas
- `GET /api/dashboard/growth` — quantos usuários novos se cadastraram a
  cada mês

## Próximo módulo sugerido
Verificação de identidade (selo de "verificado" para vendedores que
confirmam documento/telefone, aumentando a confiança na plataforma).
