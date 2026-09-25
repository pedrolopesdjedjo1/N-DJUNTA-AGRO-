---
name: Expo no Replit
description: Requisitos de bundle e inicialização do app Expo neste ambiente Linux.
---

O app Expo deve declarar `babel-preset-expo` na versão compatível com o SDK usado; depender apenas de uma instalação transitiva faz o Metro falhar ao transformar o bundle.

**Why:** O ambiente pode resolver o preset de forma diferente entre instalações, e a ausência explícita causou erro de transformação antes de o app chegar ao Expo Go.

**How to apply:** Ao iniciar o mobile no Replit, use o script `start:tunnel`, que define `EXPO_UNSTABLE_HEADLESS=1`. Isso mantém o Metro e o túnel para o Expo Go, evitando que o shell desktop do React Native DevTools tente carregar bibliotecas gráficas indisponíveis no ambiente Linux.