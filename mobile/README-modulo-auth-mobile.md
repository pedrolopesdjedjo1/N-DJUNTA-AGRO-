# Módulo 1 do Mobile — Configuração + Login/Cadastro

Primeira parte do app mobile: estrutura do projeto Expo, tema de cores
(verde/branco/preto), conexão com o backend, e as telas de login e cadastro.

## Arquivos deste módulo
- `package.json` — dependências do projeto
- `app.json` — configuração do Expo (nome do app, ícone, etc)
- `babel.config.js` — configuração necessária do Expo
- `App.tsx` — arquivo principal que liga tudo
- `src/theme/colors.ts` — paleta de cores (verde, branco, preto)
- `src/api/client.ts` — conexão com o backend
- `src/context/AuthContext.tsx` — gerencia o login em todo o app
- `src/navigation/AppNavigator.tsx` — decide qual tela mostrar
- `src/screens/LoginScreen.tsx`
- `src/screens/RegisterScreen.tsx`
- `src/screens/HomeScreen.tsx` — tela temporária, será substituída

## Como rodar (quando tiver o projeto no Replit)
```bash
cd mobile
npm install
npx expo start
