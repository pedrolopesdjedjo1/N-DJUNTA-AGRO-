---
name: Expo no Replit
description: Requisitos de bundle e inicialização do app Expo neste ambiente Linux.
---

O app Expo deve declarar `babel-preset-expo` na versão compatível com o SDK usado; depender apenas de uma instalação transitiva faz o Metro falhar ao transformar o bundle.

**Why:** O ambiente pode resolver o preset de forma diferente entre instalações, e a ausência explícita causou erro de transformação antes de o app chegar ao Expo Go.

**How to apply:** Ao iniciar o mobile no Replit, use o script `start:tunnel`, que define `EXPO_UNSTABLE_HEADLESS=1`. Isso mantém o Metro e o túnel para o Expo Go, evitando que o shell desktop do React Native DevTools tente carregar bibliotecas gráficas indisponíveis no ambiente Linux.

O backend TypeScript também depende de um Prisma Client regenerado sempre que o schema ganha modelos novos; se o cliente estiver desatualizado, o servidor pode falhar na compilação antes de abrir a porta, fazendo o mobile mostrar apenas um erro genérico de cadastro.

**Why:** O modelo `PlatformSettings` existia no schema, mas não no cliente gerado, e isso impediu todas as rotas — inclusive autenticação — de iniciarem.

**How to apply:** Depois de alterar `backend/prisma/schema.prisma`, rode `npx prisma generate` e valide a compilação antes de testar o app mobile.