import express from "express";
import type { Database } from "sqlite";
import type sqlite3 from "sqlite3";
import { createCandidatesRouter } from "./routes/candidates.routes";
import { CandidatesRepository } from "./repositories/candidates.repository";
import { CandidatesService } from "./services/candidates.service";

type AppConfig = {
  legacyApiKey?: string;
  legacyApiUrl?: string;
};

export const setupApp = async (
  db: Database<sqlite3.Database, sqlite3.Statement>,
  config: AppConfig = {}
) => {
  const app = express();

  app.use(express.json());

  const candidatesRepository = new CandidatesRepository(db);
  const candidatesService = new CandidatesService(candidatesRepository, {
    expectedApiKey: config.legacyApiKey,
    legacyApiKey: config.legacyApiKey,
    legacyApiUrl: config.legacyApiUrl,
  });

  app.use(createCandidatesRouter(candidatesService));

  return app;
};
