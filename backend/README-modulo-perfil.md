# Módulo de Perfil Público — NôdjuntaAgro GB

Mostra a página de um usuário: seus dados básicos, os produtos que ele tem
à venda e as avaliações que recebeu. Não precisa de login para ver.

Este módulo é mais simples que os anteriores: não cria nenhuma tabela nova
no banco, só reúne informações que já existem (usuário + produtos + avaliações).

## Arquivos NOVOS deste módulo
- `src/services/profileService.ts`
- `src/controllers/profileController.ts`
- `src/routes/profileRoutes.ts`

## Arquivo que foi EDITADO neste módulo
- `src/server.ts` — ligada a nova rota de perfil
  (não precisou editar o `schema.prisma` neste módulo)

## Como testar depois de rodar
- `GET /api/profile/:userId` — mostra o perfil completo de um usuário:
  dados básicos, lista de produtos disponíveis, últimas avaliações e a
  média de estrelas

## Próximo módulo sugerido
Busca e filtros avançados (comprador procura produtos por categoria, região e preço).
