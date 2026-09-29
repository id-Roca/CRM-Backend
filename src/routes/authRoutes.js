import express from "express";
import { login } from "../authControllers/authControllers.js";

const router = express.Router();

router.post("/auth/login", login);

export default router;
