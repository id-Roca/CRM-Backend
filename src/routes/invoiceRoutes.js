import express from "express";
import {
  getAllInvoices,
  getInvoiceById,
  createNewInvoice,
  updateInvoice,
} from "../controllers/invoiceControllers.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/autorizeRoles.js";

const router = express.Router();

router.get(
  "/invoices",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES", "SUPPORT"),
  getAllInvoices,
);

router.get(
  "/invoices/:id",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES", "SUPPORT"),
  getInvoiceById,
);

router.post(
  "/invoices",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES"),
  createNewInvoice,
);

router.patch(
  "/invoices/:id",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES"),
  updateInvoice,
);

export default router;
