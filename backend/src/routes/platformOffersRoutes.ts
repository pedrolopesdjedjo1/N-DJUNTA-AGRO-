import { Router } from "express";
import { publicOffers, publicOfferRequest, publicMyRequests } from "../controllers/transporterBusinessController";

// Para todas as pessoas com conta. Entra junto com as outras de /api/platform:
// app.use("/api/platform", authMiddleware, platformRoutes, ..., platformTransportRoutes, platformOffersRoutes)
const router = Router();

router.get("/transport-offers", publicOffers);
router.post("/transport-offers/:id/requests", publicOfferRequest);
router.get("/transport-requests/mine", publicMyRequests);

export default router;
