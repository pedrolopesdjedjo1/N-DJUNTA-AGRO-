# Módulo de SMS/Modo Offline — NôdjuntaAgro GB

Prepara a lógica para agricultores com celular simples (sem internet)
conseguirem consultar informações do app por SMS. Por enquanto, o comando
suportado é `PRECO`, que devolve o preço médio das categorias de produto.

**Importante:** para SMS de verdade funcionar em produção (chegar no celular
da pessoa), é preciso contratar um serviço de gateway de SMS no futuro
(ex: Africa's Talking, que atende bem a região da África Ocidental, ou
Twilio). Isso tem custo e fica para quando o projeto estiver mais avançado.
Por enquanto, o comando pode ser testado direto pela API, sem gastar nada.

## Arquivos NOVOS deste módulo
- `src/services/smsService.ts`
- `src/controllers/smsController.ts`
- `src/routes/smsRoutes.ts`

## Arquivos que foram EDITADOS neste módulo
- `prisma/schema.prisma` — adicionado o modelo de Log de SMS
- `src/server.ts` — ligadas as novas rotas de SMS

## Como testar depois de rodar
- `POST /api/sms/incoming` — simula um SMS chegando (no futuro, o gateway
  de SMS vai chamar essa rota automaticamente)
  ```json
  { "phone": "+245 9000000", "message": "PRECO" }
