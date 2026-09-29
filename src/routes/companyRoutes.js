import express from "express";
import {
  getAllCompanies,
  getCompaniesById,
  createNewCompany,
  updateCompany,
  deleteCompany,
} from "../companyControllers/companyControllers.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/autorizeRoles.js";

const router = express.Router();

router.get(
  "/companies",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES", "SUPPORT"),
  getAllCompanies,
);

router.get(
  "/companies/:id",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES", "SUPPORT"),
  getCompaniesById,
);

router.post(
  "/companies",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES", "SUPPORT"),
  createNewCompany,
);

router.patch(
  "/companies/:id",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES", "SUPPORT"),
  updateCompany,
);

router.delete(
  "/companies/:id",
  authenticateToken,
  authorizeRoles("ADMIN"),
  deleteCompany,
);
export default router;
