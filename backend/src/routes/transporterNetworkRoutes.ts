import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  contacts,
  contactLog,
  contactHistoryList,
  directoryList,
  offersMine,
  offerCreate,
  offerUpdate,
  offerClose,
  proposals,
  proposalRespond,
} from "../controllers/transporterNetworkController";

const router = Router();

router.use(authMiddleware);

// Clientes e contactos
router.get("/contacts", contacts);
router.post("/contacts/log", contactLog);
router.get("/contacts/history", contactHistoryList);
router.get("/directory", directoryList);

// Ofertas de transporte e propostas
router.get("/offers/mine", offersMine);
router.post("/offers", offerCreate);
router.put("/offers/:id", offerUpdate);
router.post("/offers/:id/close", offerClose);
router.get("/proposals", proposals);
router.post("/proposals/:id/respond", proposalRespond);

export default router;
