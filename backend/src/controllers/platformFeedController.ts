import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { alertFeed } from "../services/adminBroadcastService";
import { publicBanners, publicHighlights } from "../services/adminContentService";
import { myReplies } from "../services/adminSupportService";
import { getSetting } from "../lib/platformSettings";

async function run(res: Response, work: () => Promise<any>) {
  try {
    return res.status(200).json(await work());
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export const alerts = (req: AuthRequest, res: Response) => run(res, () => alertFeed(req.userId!));
export const banners = (req: AuthRequest, res: Response) => run(res, () => publicBanners(req.userId!));
export const highlights = (req: AuthRequest, res: Response) => run(res, () => publicHighlights(typeof req.query.kind === "string" ? req.query.kind : undefined));
export const supportReplies = (req: AuthRequest, res: Response) => run(res, () => myReplies(req.userId!));

// Nome, logo, idiomas, contactos e textos legais (qualquer pessoa com conta)
export const settings = (req: AuthRequest, res: Response) =>
  run(res, async () => {
    const [name, logoUrl, languages, email, phones, terms, privacy] = await Promise.all([
      getSetting<string>("platform.name"),
      getSetting<string>("platform.logoUrl"),
      getSetting<string[]>("platform.languages"),
      getSetting<string>("support.email"),
      getSetting<string[]>("support.phones"),
      getSetting<string>("legal.terms"),
      getSetting<string>("legal.privacy"),
    ]);
    return { name, logoUrl, languages, support: { email, phones }, terms, privacy };
  });
