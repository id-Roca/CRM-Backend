import prisma from "../prisma.js";
import {
  createOfferSchema,
  updateOfferSchema,
  offerIdSchema,
  offerFilterSchema,
} from "../schemas/offerSchemas.js";

import {
  getValidOfferContact,
  offerDetailSelect,
  getValidOfferSalesUser,
} from "../helpers/offerHelper.js";

// GET all offers
export const getAllOffers = async (req, res, next) => {
  try {
    const result = offerFilterSchema.safeParse(req.query);

    if (!result.success) {
      const error = new Error(result.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const { status, companyId, salesUserId, page, limit } = result.data;
    const skip = (page - 1) * limit;
    const where = {
      ...(status && { status }),
      ...(companyId && { companyId }),
      ...(salesUserId && { salesUserId }),
    };

    const totalItems = await prisma.offer.count({ where });

    const offers = await prisma.offer.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        id: "asc",
      },
    });

    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      data: offers,
      page,
      limit,
      totalItems,
      totalPages,
    });
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

    if (req.user.role !== "ADMIN" && requestedSalesUserId !== undefined) {
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
      contact = await getValidOfferContact(contactId, companyId);
    }

    await getValidOfferSalesUser(salesUserId);

    const newOffer = await prisma.offer.create({
      data: {
        description,
        amount,
        companyId,
        contactId: contact?.id ?? null,
        salesUserId,
      },
      select: offerDetailSelect,
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

    const { description, amount, companyId, contactId, salesUserId, status } =
      result.data;

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
      contactId !== undefined ? contactId : existingOffer.contactId;

    if (effectiveContactId !== null) {
      await getValidOfferContact(effectiveContactId, effectiveCompanyId);
    }

    if (salesUserId !== undefined) {
      await getValidOfferSalesUser(salesUserId);
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
      select: offerDetailSelect,
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
