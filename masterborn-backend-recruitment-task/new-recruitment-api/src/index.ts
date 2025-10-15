import "dotenv/config";
import * as process from "node:process";
import { setupDb } from "./db";
import { setupApp } from "./app";

const PORT = process.env.PORT ?? 3000;

main();

async function main() {
  const db = await setupDb();
  const app = await setupApp(db, { legacyApiKey: process.env.LEGACY_API_KEY });

  app.listen(PORT, () => {
    console.log(`[server]: Server is running at http://localhost:${PORT}`);
  });
}
