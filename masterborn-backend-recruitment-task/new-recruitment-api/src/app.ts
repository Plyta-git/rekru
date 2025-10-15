import express from "express";
import type { Database } from "sqlite";
import type sqlite3 from "sqlite3";
import { CandidatesController } from "./candidates.controller";

type AppConfig = {
    legacyApiKey?: string;
};

export const setupApp = async (
    db: Database<sqlite3.Database, sqlite3.Statement>,
    config: AppConfig = {}
) => {
    const app = express();

    app.use(express.json());

    app.use(new CandidatesController(db, config.legacyApiKey).router);

    return app;
}
