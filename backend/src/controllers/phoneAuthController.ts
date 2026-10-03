import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/phoneAuthService";

export async function register(req: Request, res: Response) {
  try {
    const { name, email, phone, password, role, location } = req.body;

    if (!name || !phone || !password || !role) {
      return res.status(400).json({ error: "Preencha nome, celular, senha e perfil." });
    }

    const result = await registerUser({ name, email, phone, password, role, location });
    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(error?.status ?? 400).json({ error: error.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { phone, email, password } = req.body;

    if ((!phone && !email) || !password) {
      return res.status(400).json({ error: "Preencha o celular e a senha." });
    }

    const result = await loginUser({ phone, email, password });
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(error?.status ?? 401).json({ error: error.message });
  }
}
