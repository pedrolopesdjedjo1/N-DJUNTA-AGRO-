# NôdjuntaAgro GB Backend

## Run locally on Replit

The backend is started by the `Backend API` workflow:

```bash
cd backend
npm run dev
```

The API listens on port `3000`. The root endpoint is `GET /`.

## Database setup

The Prisma schema is in `backend/prisma/schema.prisma`. After `DATABASE_URL`
points to a reachable PostgreSQL database, run:

```bash
cd backend
npx prisma migrate dev
```

The current configured PostgreSQL host was unreachable when setup was attempted,
so the migration still needs to be run after the database connection is fixed.