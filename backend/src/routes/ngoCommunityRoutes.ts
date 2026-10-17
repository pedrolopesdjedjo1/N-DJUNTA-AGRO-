import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  communities,
  newCommunity,
  editCommunity,
  removeCommunity,
  needs,
  newNeed,
  editNeed,
  removeNeed,
  beneficiaries,
  newBeneficiary,
  bulkBeneficiaries,
  editBeneficiary,
  removeBeneficiary,
  overview,
  discoverPeople,
  organizations,
  newRequest,
  myOwnRequests,
  removeOwnRequest,
  requests,
  answerRequest,
  toBeneficiary,
} from "../controllers/ngoCommunityController";

const router = Router();

router.use(authMiddleware);

router.get("/communities", communities);
router.post("/communities", newCommunity);
router.put("/communities/:id", editCommunity);
router.delete("/communities/:id", removeCommunity);

router.get("/needs", needs);
router.post("/needs", newNeed);
router.put("/needs/:id", editNeed);
router.delete("/needs/:id", removeNeed);

router.get("/beneficiaries", beneficiaries);
router.post("/beneficiaries", newBeneficiary);
router.post("/beneficiaries/bulk", bulkBeneficiaries);
router.put("/beneficiaries/:id", editBeneficiary);
router.delete("/beneficiaries/:id", removeBeneficiary);

router.get("/support-overview", overview);
router.get("/discover", discoverPeople);
router.get("/organizations", organizations);

router.post("/requests", newRequest);
router.get("/requests/mine", myOwnRequests);
router.get("/requests", requests);
router.delete("/requests/:id", removeOwnRequest);
router.patch("/requests/:id", answerRequest);
router.post("/requests/:id/beneficiary", toBeneficiary);

export default router;
