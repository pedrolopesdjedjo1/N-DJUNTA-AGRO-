import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/authServive";

export async function register(req: Request, res: Response) {
  try {
    const { name, email, phone, password, role, location } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Preencha nome, e-mail, senha e perfil." });
    }

    const result = await registerUser({ name, email, phone, password, role, location });
    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Preencha e-mail e senha." });
    }

    const result = await loginUser({ email, password });
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }
}
