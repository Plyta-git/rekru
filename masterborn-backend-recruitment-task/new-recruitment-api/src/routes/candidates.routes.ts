import { CandidatesController } from "../controllers/candidates.controller";
import { CandidatesService } from "../services/candidates.service";

export const createCandidatesRouter = (service: CandidatesService) => {
  const controller = new CandidatesController(service);
  return controller.router;
};
