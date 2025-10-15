import {
  CandidatesRepository,
  CandidateRow,
} from "../repositories/candidates.repository";

export type CandidatePayload = {
  firstName: string;
  lastName: string;
  email: string;
  jobOfferIds: number[];
};

type CandidateServiceConfig = {
  expectedApiKey?: string;
  legacyApiKey?: string;
  legacyApiUrl?: string;
};

type CreateCandidateSuccess = {
  type: "success";
  status: 201;
  body: {
    message: string;
    candidate: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      createdAt: string;
      jobOfferIds: number[];
    };
  };
};

type CreateCandidateError = {
  type: "error";
  status: number;
  body: {
    message: string;
    errors?: string[];
  };
};

export type CreateCandidateResult =
  | CreateCandidateSuccess
  | CreateCandidateError;

export class CandidatesService {
  constructor(
    private readonly repository: CandidatesRepository,
    private readonly config: CandidateServiceConfig = {}
  ) {}

  async createCandidate(
    payload: CandidatePayload,
    apiKey: string | undefined
  ): Promise<CreateCandidateResult> {
    if (!this.isAuthorized(apiKey)) {
      return {
        type: "error",
        status: 403,
        body: { message: "Forbidden: Invalid API Key." },
      };
    }

    const normalizedJobOfferIds = Array.from(
      new Set(payload.jobOfferIds.map((id) => Number(id)))
    ).filter((id) => Number.isInteger(id) && id > 0);

    if (normalizedJobOfferIds.length === 0) {
      return {
        type: "error",
        status: 400,
        body: {
          message: "Validation failed",
          errors: ["At least one valid job offer id must be provided"],
        },
      };
    }

    const existingCandidate = await this.repository.findCandidateByEmail(
      payload.email
    );

    if (existingCandidate) {
      return {
        type: "error",
        status: 409,
        body: { message: "Candidate with this email already exists." },
      };
    }

    const boundJobOffers = await this.repository.findJobOffersByIds(
      normalizedJobOfferIds
    );

    if (boundJobOffers.length !== normalizedJobOfferIds.length) {
      return {
        type: "error",
        status: 400,
        body: {
          message: "Validation failed",
          errors: ["One or more job offers do not exist."],
        },
      };
    }

    const { legacyApiKey, legacyApiUrl } = this.resolveLegacyApiDetails();

    if (!legacyApiKey) {
      return {
        type: "error",
        status: 500,
        body: { message: "Legacy API key is not configured." },
      };
    }

    let legacyEndpoint: string;

    try {
      legacyEndpoint = new URL("/candidates", legacyApiUrl).toString();
    } catch {
      return {
        type: "error",
        status: 500,
        body: { message: "Legacy API URL is invalid." },
      };
    }

    const consentDate = new Date().toISOString();

    try {
      await this.repository.beginTransaction();

      const result = await this.repository.insertCandidate(
        payload.firstName,
        payload.lastName,
        payload.email,
        "nowy",
        consentDate
      );

      const candidateId = result.lastID;

      if (!candidateId) {
        await this.repository.rollbackTransaction();
        return {
          type: "error",
          status: 500,
          body: {
            message: "Unable to determine created candidate identifier.",
          },
        };
      }

      for (const jobOfferId of normalizedJobOfferIds) {
        await this.repository.insertCandidateJobOffer(candidateId, jobOfferId);
      }

      try {
        const legacyResponse = await fetch(legacyEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": legacyApiKey,
          },
          body: JSON.stringify({
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: payload.email,
          }),
        });

        let legacyResponseBody: unknown = null;
        const responseBodyText = await legacyResponse.text();

        if (responseBodyText) {
          try {
            legacyResponseBody = JSON.parse(responseBodyText);
          } catch {
            legacyResponseBody = responseBodyText;
          }
        }

        if (!legacyResponse.ok) {
          await this.repository.rollbackTransaction();

          const statusCode =
            legacyResponse.status >= 400 && legacyResponse.status <= 599
              ? legacyResponse.status
              : 502;

          const message =
            typeof legacyResponseBody === "object" &&
            legacyResponseBody !== null &&
            "message" in legacyResponseBody
              ? String((legacyResponseBody as { message: unknown }).message)
              : "Failed to synchronize candidate with legacy API.";

          return {
            type: "error",
            status: statusCode,
            body: { message },
          };
        }
      } catch {
        await this.repository.rollbackTransaction();
        return {
          type: "error",
          status: 500,
          body: { message: "Communication with legacy API failed." },
        };
      }

      const candidate = await this.repository.findCandidateById(candidateId);

      if (!candidate) {
        await this.repository.rollbackTransaction();
        return {
          type: "error",
          status: 500,
          body: { message: "Unable to load created candidate." },
        };
      }

      await this.repository.commitTransaction();

      return this.buildSuccessResponse(candidate, normalizedJobOfferIds);
    } catch {
      await this.repository.rollbackTransaction();
      return {
        type: "error",
        status: 500,
        body: { message: "Failed to create candidate." },
      };
    }
  }

  isAuthorized(apiKey: string | undefined) {
    return (
      Boolean(apiKey) &&
      Boolean(this.config.expectedApiKey) &&
      apiKey === this.config.expectedApiKey
    );
  }

  async getCandidates(page: number, limit: number) {
    const offset = (page - 1) * limit;
    const [totalItems, candidates] = await Promise.all([
      this.repository.countCandidates(),
      this.repository.findCandidatesPaginated(limit, offset),
    ]);

    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;

    return {
      data: candidates.map((candidate: CandidateRow) => ({
        id: candidate.id,
        firstName: candidate.first_name,
        lastName: candidate.last_name,
        email: candidate.email,
        createdAt: candidate.created_at,
      })),
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  private resolveLegacyApiDetails() {
    const legacyApiUrl =
      this.config.legacyApiUrl ??
      process.env.LEGACY_API_URL ??
      "http://localhost:4040";
    const legacyApiKey =
      this.config.legacyApiKey ??
      this.config.expectedApiKey ??
      process.env.LEGACY_API_KEY;

    return { legacyApiUrl, legacyApiKey };
  }

  private buildSuccessResponse(
    candidate: CandidateRow,
    jobOfferIds: number[]
  ): CreateCandidateSuccess {
    return {
      type: "success",
      status: 201,
      body: {
        message: "Candidate added successfully",
        candidate: {
          id: candidate.id,
          firstName: candidate.first_name,
          lastName: candidate.last_name,
          email: candidate.email,
          createdAt: candidate.created_at,
          jobOfferIds,
        },
      },
    };
  }
}
