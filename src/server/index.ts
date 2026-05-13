import { buildApp } from "./app";
import { createPool, ensureDatabase, initializeSchema } from "./db";
import { PostgresRepository } from "./repository";

async function main() {
  await ensureDatabase();
  const pool = createPool();
  await initializeSchema(pool);

  const app = await buildApp({ repository: new PostgresRepository(pool) });
  const port = Number(process.env.PORT ?? 3001);
  await app.listen({ host: "0.0.0.0", port });
  console.log(`Basketball PK API listening on http://localhost:${port}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
