import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  catalog,
  me,
  saveMe,
  addDoc,
  removeDoc,
  submit,
  publicAgent,
  adminAgents,
  adminReview,
  clients,
  registerLink,
  invite,
  clientOne,
  clientNotes,
  clientRemove,
  clientActivityAdd,
  activities,
  assistStart,
  assistRenew,
  assistEnd,
  assistSessions,
  mine,
  respond,
  revoke,
  mineActivity,
  rate,
} from "../controllers/agentController";

const router = Router();

router.use(authMiddleware);

router.get("/catalog", catalog);

// O meu perfil de agente
router.get("/me", me);
router.put("/me", saveMe);
router.post("/me/documents", addDoc);
router.delete("/me/documents/:id", removeDoc);
router.post("/me/submit", submit);
router.get("/public/:id", publicAgent);

// Equipa do app
router.get("/admin/agents", adminAgents);
router.post("/admin/agents/:userId/review", adminReview);

// Clientes do agente (rotas fixas primeiro, antes de /:id)
router.get("/clients", clients);
router.post("/clients/register-link", registerLink);
router.post("/clients/invite", invite);
router.get("/clients/:id", clientOne);
router.patch("/clients/:id/notes", clientNotes);
router.delete("/clients/:id", clientRemove);
router.post("/clients/:id/activities", clientActivityAdd);
router.post("/clients/:id/assist", assistStart);

router.get("/activities", activities);

// Sessões de ajuda
router.get("/assist/sessions", assistSessions);
router.post("/assist/:sessionId/renew", assistRenew);
router.post("/assist/:sessionId/end", assistEnd);

// Do lado da pessoa ajudada
router.get("/my-agents", mine);
router.post("/my-agents/:linkId/respond", respond);
router.delete("/my-agents/:linkId", revoke);
router.get("/my-agents/:linkId/activity", mineActivity);
router.post("/my-agents/:linkId/rate", rate);

export default router;
