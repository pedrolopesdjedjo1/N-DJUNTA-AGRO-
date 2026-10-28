import { Router } from "express";
import { requirePermission } from "../middleware/adminGuard";
import * as c from "../controllers/backofficeOrgsController";

// A autenticação e o adminContext entram no server.ts, antes destas rotas
const router = Router();

router.get("/catalog/orgs", c.orgsCatalog);

// Cooperativas
router.get("/coops", requirePermission("coops.manage", "profiles.view"), c.coopList);
router.get("/coops/:id", requirePermission("coops.manage", "profiles.view"), c.coopOne);
router.put("/coops/:id", requirePermission("coops.manage"), c.coopEdit);
router.post("/coops/:id/review", requirePermission("coops.manage"), c.coopReview);

// ONGs e instituições
router.get("/orgs", requirePermission("orgs.manage", "profiles.view", "gov.view"), c.orgList);
router.get("/orgs/:userId", requirePermission("orgs.manage", "profiles.view", "gov.view"), c.orgOne);
router.post("/orgs/:userId/suspend", requirePermission("orgs.manage"), c.orgSuspend);
router.post("/orgs/:userId/reactivate", requirePermission("orgs.manage"), c.orgReactivate);
router.post("/orgs/:userId/notify", requirePermission("orgs.manage", "content.manage"), c.orgNotify);

// Esconder e repor publicações, oportunidades e projetos
router.post("/content/hide", requirePermission("orgs.manage", "content.manage"), c.contentHide);
router.post("/content/restore", requirePermission("orgs.manage", "content.manage"), c.contentRestore);

// Governo
router.get("/gov/overview", requirePermission("gov.view", "orgs.manage"), c.govOverview);
router.get("/gov/programs", requirePermission("gov.view", "orgs.manage"), c.govPrograms);
router.get("/gov/services", requirePermission("gov.view", "orgs.manage"), c.govServices);
router.post("/gov/services/:id/published", requirePermission("orgs.manage", "content.manage"), c.govServicePublished);
router.get("/gov/publications", requirePermission("gov.view", "orgs.manage"), c.govPublications);
router.get("/gov/requests", requirePermission("gov.view", "orgs.manage"), c.govRequests);

export default router;
