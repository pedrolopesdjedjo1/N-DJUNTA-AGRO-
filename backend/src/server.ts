import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import messageRoutes from "./routes/messageRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import adminRoutes from "./routes/adminRoutes";
import reportRoutes from "./routes/reportRoutes";
import translationRoutes from "./routes/translationRoutes";
import smsRoutes from "./routes/smsRoutes";
import agricultorRoutes from "./routes/agricultorRoutes";
import pescadorRoutes from "./routes/pescadorRoutes";
import compradorRoutes from "./routes/compradorRoutes";
import comercianteRoutes from "./routes/comercianteRoutes";
import agenteRoutes from "./routes/agenteRoutes";
import transportadorRoutes from "./routes/transportadorRoutes";
import governoRoutes from "./routes/governoRoutes";
import ongRoutes from "./routes/ongRoutes";
import comunsRoutes from "./routes/comunsRoutes";
import conteudoRoutes from "./routes/conteudoRoutes";

dotenv.config();

const app = express();
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/translations", translationRoutes);
app.use("/api/sms", smsRoutes);

// Módulos por perfil (funcionalidades 1 a 100)
app.use("/api/agricultor", agricultorRoutes);
app.use("/api/pescador", pescadorRoutes);
app.use("/api/comprador", compradorRoutes);
app.use("/api/comerciante", comercianteRoutes);
app.use("/api/agente", agenteRoutes);
app.use("/api/transportador", transportadorRoutes);
app.use("/api/governo", governoRoutes);
app.use("/api/ong", ongRoutes);
app.use("/api/comuns", comunsRoutes);
app.use("/api/conteudo", conteudoRoutes);

app.get("/", (_req, res) => {
  res.json({ status: "NôdjuntaAgro GB API rodando" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
