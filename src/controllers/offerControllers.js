import prisma from "../prisma.js";
import { z } from "zod";

const createOfferSchema = z.object({
  description: z.string().min(3, "Description must be at least 3 characters."),
  amount: z.number().positive("Amount must be greater than 0."),
  companyId: z.number().int().positive(),
  contactId: z.number().int().positive().optional(),
  salesUserId: z.number().int().positive().optional(),
});

const updateOfferSchema = z
  .object({
    description: z
      .string()
      .min(3, "Description must be at least 3 characters.")
      .optional(),
    amount: z.number().positive("Amount must be greater than 0.").optional(),
    companyId: z.number().int().positive().optional(),
    contactId: z.number().int().positive().optional(),
    salesUserId: z.number().int().positive().optional(),
    status: z
      .enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "CANCELLED"])
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required.",
  });

const offerIdSchema = z.coerce
  .number({
    error: "Offer ID must be a number.",
  })
  .int()
  .positive("Offer ID must be a positive number.");

// GET all offers
export const getAllOffers = async (req, res, next) => {
  try {
    const offers = await prisma.offer.findMany({
      orderBy: {
        id: "asc",
      },
    });

    res.json(offers);
  } catch (error) {
    next(error);
  }
};

export const getOfferById = async (req, res, next) => {
  try {
    const id = offerIdSchema.safeParse(req.params.id);

    if (!id.success) {
      const error = new Error(id.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const offer = await prisma.offer.findUnique({
      where: {
        id: id.data,
      },
      select: {
        id: true,
        description: true,
        amount: true,
        status: true,

        company: {
          select: {
            id: true,
            name: true,
          },
        },

        contact: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        salesUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },

        createdAt: true,
        updatedAt: true,
      },
    });

    if (!offer) {
      const error = new Error("Offer not found.");
      error.statusCode = 404;
      throw error;
    }

    res.json(offer);
  } catch (error) {
    next(error);
  }
};

export const createNewOffer = async (req, res, next) => {
  try {
    const result = createOfferSchema.safeParse(req.body);

    if (!result.success) {
      const error = new Error(result.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const {
      description,
      amount,
      companyId,
      contactId,
      salesUserId: requestedSalesUserId,
    } = result.data;

    if (
      req.user.role !== "ADMIN" &&
      requestedSalesUserId !== undefined
    ) {
      const error = new Error("Only admins can assign another sales user.");
      error.statusCode = 403;
      throw error;
    }

    const salesUserId =
      req.user.role === "ADMIN" && requestedSalesUserId !== undefined
        ? requestedSalesUserId
        : req.user.userId;

    let contact = null;

    if (contactId !== undefined) {
      contact = await prisma.contact.findUnique({
        where: {
          id: contactId,
        },
      });

      if (!contact) {
        const error = new Error("Contact not found.");
        error.statusCode = 404;
        throw error;
      }

      if (contact.companyId !== companyId) {
        const error = new Error(
          "Contact does not belong to the selected company.",
        );
        error.statusCode = 400;
        throw error;
      }
    }

    const assignedUser = await prisma.user.findUnique({
      where: {
        id: salesUserId,
      },
    });

    if (!assignedUser) {
      const error = new Error("Sales user not found.");
      error.statusCode = 404;
      throw error;
    }

    const newOffer = await prisma.offer.create({
      data: {
        description,
        amount,
        companyId,
        contactId: contact?.id ?? null,
        salesUserId,
      },
      select: {
        id: true,
        description: true,
        amount: true,
        status: true,
        company: {
          select: {
            name: true,
          },
        },
        contact: {
          select: {
            name: true,
          },
        },
        salesUser: {
          select: {
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json(newOffer);
  } catch (error) {
    if (error.code === "P2003") {
      error.statusCode = 400;
      error.message = "Company or sales user does not exist.";
    }

    next(error);
  }
};

export const updateOffer = async (req, res, next) => {
  try {
    const result = updateOfferSchema.safeParse(req.body);

    if (!result.success) {
      const error = new Error(result.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const id = offerIdSchema.safeParse(req.params.id);

    if (!id.success) {
      const error = new Error(id.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const {
      description,
      amount,
      companyId,
      contactId,
      salesUserId,
      status,
    } = result.data;

    if (req.user.role !== "ADMIN" && salesUserId !== undefined) {
      const error = new Error("Only admins can reassign an offer.");
      error.statusCode = 403;
      throw error;
    }

    const existingOffer = await prisma.offer.findUnique({
      where: {
        id: id.data,
      },
    });

    if (!existingOffer) {
      const error = new Error("Offer not found.");
      error.statusCode = 404;
      throw error;
    }

    const effectiveCompanyId = companyId ?? existingOffer.companyId;

    const effectiveContactId =
      contactId !== undefined
        ? contactId
        : existingOffer.contactId;

    if (effectiveContactId !== null) {
      const contact = await prisma.contact.findUnique({
        where: {
          id: effectiveContactId,
        },
      });

      if (!contact) {
        const error = new Error("Contact not found.");
        error.statusCode = 404;
        throw error;
      }

      if (contact.companyId !== effectiveCompanyId) {
        const error = new Error(
          "Contact does not belong to the selected company.",
        );
        error.statusCode = 400;
        throw error;
      }
    }

    if (salesUserId !== undefined) {
      const assignedUser = await prisma.user.findUnique({
        where: {
          id: salesUserId,
        },
      });

      if (!assignedUser) {
        const error = new Error("Sales user not found.");
        error.statusCode = 404;
        throw error;
      }
    }

    const updatedOffer = await prisma.offer.update({
      where: {
        id: id.data,
      },
      data: {
        description,
        amount,
        companyId,
        contactId,
        salesUserId,
        status,
      },
      select: {
        id: true,
        description: true,
        amount: true,
        status: true,
        company: {
          select: {
            name: true,
          },
        },
        contact: {
          select: {
            name: true,
          },
        },
        salesUser: {
          select: {
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(updatedOffer);
  } catch (error) {
    if (error.code === "P2025") {
      error.statusCode = 404;
      error.message = "Offer not found.";
    }

    if (error.code === "P2003") {
      error.statusCode = 400;
      error.message = "Company, contact, or sales user does not exist.";
    }

    next(error);
  }
};