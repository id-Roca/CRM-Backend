import express from "express";
import {
  getAllContacts,
  getContactsById,
  createNewContact,
  updateContact,
  deleteContact,
} from "../contactsControllers/contactsControllers.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/autorizeRoles.js";

const router = express.Router();

router.get(
  "/contacts",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES", "SUPPORT"),
  getAllContacts,
);
router.get(
  "/contacts/:id",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES", "SUPPORT"),
  getContactsById,
);
router.post(
  "/contacts",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES", "SUPPORT"),
  createNewContact,
);
router.patch(
  "/contacts/:id",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES", "SUPPORT"),
  updateContact,
);
router.delete(
  "/contacts/:id",
  authenticateToken,
  authorizeRoles("ADMIN"),
  deleteContact,
);

export default router;
