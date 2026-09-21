import { Request, Response } from "express";
import { handleIncomingSms, listSmsLogs } from "../services/smsService";

// Rota que um gateway de SMS (futuro) vai chamar sempre que alguém mandar SMS
export async function incoming(req: Request, res: Response) {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: "Informe o telefone e a mensagem recebida." });
    }

    const response = await handleIncomingSms(phone, message);
    return res.status(200).json({ response });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

// Rota restrita ao admin - ver histórico de SMS
export async function logs(req: Request, res: Response) {
  try {
    const phone = req.query.phone as string | undefined;
    const data = await listSmsLogs(phone);
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
