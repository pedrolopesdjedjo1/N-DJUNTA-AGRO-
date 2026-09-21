import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  getAllTranslations,
  upsertTranslation,
  updateUserLanguage,
} from "../services/translationService";

export async function list(req: Request, res: Response) {
  try {
    const language = (req.query.lang as string)?.toUpperCase() === "CRIOULO"
      ? "CRIOULO"
      : "PORTUGUES";

    const translations = await getAllTranslations(language as any);
    return res.status(200).json(translations);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

// Rota restrita ao admin - cadastra ou corrige uma tradução
export async function upsert(req: Request, res: Response) {
  try {
    const { key, portugues, crioulo } = req.body;

    if (!key || !portugues || !crioulo) {
      return res.status(400).json({
        error: "Preencha a chave, o texto em português e o texto em crioulo.",
      });
    }

    const translation = await upsertTranslation(key, portugues, crioulo);
    return res.status(200).json(translation);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function setMyLanguage(req: AuthRequest, res: Response) {
  try {
    const { language } = req.body;

    if (!language) {
      return res.status(400).json({ error: "Informe o idioma (PORTUGUES ou CRIOULO)." });
    }

    const user = await updateUserLanguage(req.userId!, language);
    return res.status(200).json(user);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
