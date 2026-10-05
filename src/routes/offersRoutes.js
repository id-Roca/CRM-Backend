import express from "express";
import {
  getAllOffers,
  getOfferById,
  createNewOffer,
  updateOffer,
} from "../controllers/offerControllers.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/autorizeRoles.js";

const router = express.Router();

router.get(
    "/offers",
    authenticateToken,
    authorizeRoles("ADMIN", "SALES", "SUPPORT"),
    getAllOffers
);

router.get(
    "/offers/:id",
    authenticateToken,
    authorizeRoles("ADMIN", "SALES", "SUPPORT"),
    getOfferById,
);

router.post(
    "/offers",
    authenticateToken,
    authorizeRoles("ADMIN", "SALES", "SUPPORT"),
    createNewOffer,
);

router.patch(
    "/offers/:id",
    authenticateToken,
    authorizeRoles("ADMIN", "SALES", "SUPPORT"),
    updateOffer,
);

export default router;