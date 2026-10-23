import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  home,
  tasks,
  newTask,
  editTask,
  taskStatus,
  removeTask,
  needs,
  newNeed,
  editNeed,
  needStatus,
  needForward,
  removeNeed,
  producers,
  producerInvite,
  cooperatives,
  communities,
  opportunities,
  referCreate,
  referList,
} from "../controllers/agentWorkController";

const router = Router();

router.use(authMiddleware);

router.get("/home", home);

router.get("/tasks", tasks);
router.post("/tasks", newTask);
router.put("/tasks/:id", editTask);
router.patch("/tasks/:id/status", taskStatus);
router.delete("/tasks/:id", removeTask);

router.get("/needs", needs);
router.post("/needs", newNeed);
router.put("/needs/:id", editNeed);
router.patch("/needs/:id/status", needStatus);
router.post("/needs/:id/forward", needForward);
router.delete("/needs/:id", removeNeed);

router.get("/producers", producers);
router.post("/producers/:userId/invite", producerInvite);
router.get("/cooperatives", cooperatives);
router.get("/communities", communities);

router.get("/opportunities", opportunities);
router.get("/referrals", referList);
router.post("/referrals", referCreate);

export default router;
