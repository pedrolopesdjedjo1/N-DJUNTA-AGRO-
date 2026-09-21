# Módulo de Verificação de Identidade — NôdjuntaAgro GB

Permite que um usuário peça o selo de "verificado", informando que tem um
documento válido. O admin revisa e aprova ou rejeita. Usuários verificados
passam mais confiança na hora de negociar.

**Nota sobre segurança:** este módulo guarda apenas o *tipo* de documento e
uma observação de texto livre — não é feito upload nem armazenamento do
número do documento em si. A conferência do documento em si (foto, número)
é um processo manual que a equipe faz fora do banco de dados, por enquanto.

## Arquivos NOVOS deste módulo
- `src/services/verificationService.ts`
- `src/controllers/verificationController.ts`
- `src/routes/verificationRoutes.ts`

## Arquivos que foram EDITADOS neste módulo
- `prisma/schema.prisma` — adicionado o modelo de Pedido de Verificação e o selo no usuário
- `src/server.ts` — ligadas as novas rotas de verificação

## Como testar depois de rodar
- `POST /api/verifications` — pede verificação (precisa estar logado)
  ```json
  {
    "documentType": "Bilhete de Identidade",
    "documentNote": "BI apresentado presencialmente na feira de Bissau"
  }
