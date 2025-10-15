import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Database } from "sqlite";
import type sqlite3 from "sqlite3";

const loadQuery = (filename: string) => {
  const potentialPaths = [
    join(__dirname, "../db/queries", filename),
    join(process.cwd(), "src", "db", "queries", filename),
  ];

  for (const path of potentialPaths) {
    if (existsSync(path)) {
      return readFileSync(path, "utf-8").trim();
    }
  }

  throw new Error(`Query file not found: ${filename}`);
};

const BEGIN_TRANSACTION_QUERY = loadQuery("begin_transaction.sql");
const COMMIT_TRANSACTION_QUERY = loadQuery("commit_transaction.sql");
const ROLLBACK_TRANSACTION_QUERY = loadQuery("rollback_transaction.sql");
const FIND_CANDIDATE_BY_EMAIL_QUERY = loadQuery(
  "find_candidate_by_email.sql"
);
const FIND_JOB_OFFERS_BY_IDS_QUERY = loadQuery(
  "find_job_offers_by_ids.sql"
);
const INSERT_CANDIDATE_QUERY = loadQuery("insert_candidate.sql");
const INSERT_CANDIDATE_JOB_OFFER_QUERY = loadQuery(
  "insert_candidate_job_offer.sql"
);
const FIND_CANDIDATE_BY_ID_QUERY = loadQuery("find_candidate_by_id.sql");

export type CandidateRow = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
};

export class CandidatesRepository {
  constructor(
    private readonly db: Database<sqlite3.Database, sqlite3.Statement>
  ) {}

  beginTransaction() {
    return this.db.exec(BEGIN_TRANSACTION_QUERY);
  }

  commitTransaction() {
    return this.db.exec(COMMIT_TRANSACTION_QUERY);
  }

  rollbackTransaction() {
    return this.db.exec(ROLLBACK_TRANSACTION_QUERY);
  }

  findCandidateByEmail(email: string) {
    return this.db.get<{ id: number }>(
      FIND_CANDIDATE_BY_EMAIL_QUERY,
      email
    );
  }

  findJobOffersByIds(ids: number[]) {
    const placeholders = ids.map(() => "?").join(", ");
    const query = FIND_JOB_OFFERS_BY_IDS_QUERY.replace(
      "__PLACEHOLDERS__",
      placeholders
    );

    return this.db.all(query, ids) as Promise<Array<{ id: number }>>;
  }

  insertCandidate(
    firstName: string,
    lastName: string,
    email: string,
    recruitmentStatus: string,
    consentDate: string
  ) {
    return this.db.run(
      INSERT_CANDIDATE_QUERY,
      firstName,
      lastName,
      email,
      recruitmentStatus,
      consentDate
    );
  }

  insertCandidateJobOffer(candidateId: number, jobOfferId: number) {
    return this.db.run(
      INSERT_CANDIDATE_JOB_OFFER_QUERY,
      candidateId,
      jobOfferId
    );
  }

  findCandidateById(id: number) {
    return this.db.get<CandidateRow>(FIND_CANDIDATE_BY_ID_QUERY, id);
  }
}
