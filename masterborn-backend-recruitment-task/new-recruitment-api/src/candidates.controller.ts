import { Request, Response, Router } from "express";
import { body, validationResult } from "express-validator";
import type { Database } from "sqlite";
import type sqlite3 from "sqlite3";

type CandidateRow = {
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
};

type CandidatePayload = {
  firstName: string;
  lastName: string;
  email: string;
};

export class CandidatesController {
  readonly router = Router();

  private readonly validators = [
    body("firstName").trim().notEmpty().withMessage("First name is required"),
    body("lastName").trim().notEmpty().withMessage("Last name is required"),
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .bail()
      .isEmail()
      .withMessage("Invalid email format"),
  ];

  constructor(
    private readonly db: Database<sqlite3.Database, sqlite3.Statement>,
    private readonly expectedApiKey?: string
  ) {
    this.router.post("/candidates", ...this.validators, this.create.bind(this));
  }

  private isAuthorized(apiKey: string | undefined) {
    return (
      Boolean(apiKey) &&
      Boolean(this.expectedApiKey) &&
      apiKey === this.expectedApiKey
    );
  }

  async create(req: Request, res: Response) {
    console.log(req);

    if (!this.isAuthorized(req.header("x-api-key"))) {
      return res.status(403).json({ message: "Forbidden: Invalid API Key." });
    }

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.array().map((error) => error.msg),
      });
    }

    const { firstName, lastName, email } = req.body as CandidatePayload;
    const existingCandidate = await this.db.get<{ id: number }>(
      "SELECT id FROM Candidate WHERE email = ?",
      email
    );

    if (existingCandidate) {
      return res
        .status(409)
        .json({ message: "Candidate with this email already exists." });
    }

    const consentDate = new Date().toISOString();

    const result = await this.db.run(
      `INSERT INTO Candidate (first_name, last_name, email, recruitment_status, consent_date)
             VALUES (?, ?, ?, ?, ?)`,
      firstName,
      lastName,
      email,
      "nowy",
      consentDate
    );

    const candidate = await this.db.get<CandidateRow>(
      `SELECT first_name, last_name, email, created_at FROM Candidate WHERE id = ?`,
      result.lastID
    );

    if (!candidate) {
      return res
        .status(500)
        .json({ message: "Unable to load created candidate." });
    }

    return res.status(201).json({
      message: "Candidate added successfully",
      candidate: {
        firstName: candidate.first_name,
        lastName: candidate.last_name,
        email: candidate.email,
        createdAt: candidate.created_at,
      },
    });
  }
}
