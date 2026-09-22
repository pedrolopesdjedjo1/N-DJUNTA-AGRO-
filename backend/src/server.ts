import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import messageRoutes from "./routes/messageRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import profileRoutes from "./routes/profileRoutes";
import searchRoutes from "./routes/searchRoutes";
import favoriteRoutes from "./routes/favoriteRoutes";
import adminRoutes from "./routes/adminRoutes";
import reportRoutes from "./routes/reportRoutes";
import marketPriceRoutes from "./routes/marketPriceRoutes";
import transportRoutes from "./routes/transportRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import translationRoutes from "./routes/translationRoutes";
import smsRoutes from "./routes/smsRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import verificationRoutes from "./routes/verificationRoutes";
import weatherAlertRoutes from "./routes/weatherAlertRoutes";
import cooperativeRoutes from "./routes/cooperativeRoutes";

dotenv.config();

const app = express();
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/market-prices", marketPriceRoutes);
app.use("/api/transport", transportRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/translations", translationRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/verifications", verificationRoutes);
app.use("/api/weather-alerts", weatherAlertRoutes);
app.use("/api/cooperatives", cooperativeRoutes);

app.get("/", (_req, res) => {
  res.json({ status: "NôdjuntaAgro GB API rodando" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
