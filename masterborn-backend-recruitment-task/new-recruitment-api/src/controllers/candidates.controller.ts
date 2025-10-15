import { Request, Response, Router } from "express";
import { body, validationResult } from "express-validator";
import {
  CandidatePayload,
  CandidatesService,
} from "../services/candidates.service";

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
    body("jobOfferIds")
      .isArray({ min: 1 })
      .withMessage("At least one job offer must be provided"),
    body("jobOfferIds.*")
      .isInt({ min: 1 })
      .withMessage("Job offer ids must be positive integers"),
  ];

  constructor(private readonly candidatesService: CandidatesService) {
    this.router.post(
      "/candidates",
      ...this.validators,
      this.create.bind(this)
    );
  }

  async create(req: Request, res: Response) {
    const apiKey = req.header("x-api-key");

    if (!this.candidatesService.isAuthorized(apiKey)) {
      return res.status(403).json({ message: "Forbidden: Invalid API Key." });
    }

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.array().map((error) => error.msg),
      });
    }

    const result = await this.candidatesService.createCandidate(
      req.body as CandidatePayload,
      apiKey
    );

    return res.status(result.status).json(result.body);
  }
}
