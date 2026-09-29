import express from "express";
import {
  getAllUsers,
  getUsersById,
  createUser,
  updateUser,
  deleteUser,
} from "../userControllers/userControllers.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/autorizeRoles.js";

const router = express.Router();

router.get(
    "/users",
    authenticateToken,
    authorizeRoles("ADMIN"),
    getAllUsers
);

router.get(
  "/users/:id",
  authenticateToken,
  authorizeRoles("ADMIN"),
  getUsersById,
);

router.post(
  "/users",
  authenticateToken,
  authorizeRoles("ADMIN"),
  createUser
);

router.patch(
  "/users/:id",
  authenticateToken,
  authorizeRoles("ADMIN"),
  updateUser,
);

router.delete(
  "/users/:id",
  authenticateToken,
  authorizeRoles("ADMIN"),
  deleteUser,
);

export default router;
