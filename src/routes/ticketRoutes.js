import express from "express";
import {
  getAllTickets,
  getTicketById,
  createNewTicket,
  updateTicket,
} from "../controllers/ticketControllers.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/autorizeRoles.js";

const router = express.Router();

router.get(
  "/tickets",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES", "SUPPORT"),
  getAllTickets,
);

router.get(
  "/tickets/:id",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES", "SUPPORT"),
  getTicketById,
);

router.post(
  "/tickets",
  authenticateToken,
  authorizeRoles("ADMIN", "SUPPORT"),
  createNewTicket,
);

router.patch(
  "/tickets/:id",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES", "SUPPORT"),
  updateTicket,
);

export default router;