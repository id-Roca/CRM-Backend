import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import companyRoutes from "./routes/companyRoutes.js";
import contactsRoutes from "./routes/contactsRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many login attempts, please try again later.",
  },
});
// Middleware to parse incoming JSON in request body
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use("/api", apiLimiter);
app.use("/api/auth/login", loginLimiter);

app.use("/api", companyRoutes);
app.use("/api", contactsRoutes);
app.use("/api", authRoutes);
app.use("/api", userRoutes);

app.use(notFound);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Verbindung läuft auf http://localhost:${PORT}`);
});
