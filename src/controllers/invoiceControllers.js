import prisma from "../prisma.js";
import { z } from "zod";

const createInvoiceFromOfferSchema = z
  .object({
    offerId: z.number().int().positive(),
  })
  .strict();

const createDirectInvoiceSchema = z
  .object({
    description: z
      .string()
      .min(3, "Description must be at least 3 characters."),
    amount: z.number().positive("Amount must be greater than 0."),
    companyId: z.number().int().positive(),
    contactId: z.number().int().positive().optional(),
    salesUserId: z.number().int().positive().optional(),
  })
  .strict();

const updateInvoiceSchema = z
  .object({
    description: z
      .string()
      .min(3, "Description must be at least 3 characters.")
      .optional(),
    amount: z.number().positive("Amount must be greater than 0.").optional(),
    companyId: z.number().int().positive().optional(),
    contactId: z.number().int().positive().optional(),
    salesUserId: z.number().int().positive().optional(),
    status: z.enum(["DRAFT", "ISSUED", "PAID", "CANCELLED"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required.",
  });

const invoiceIdSchema = z.coerce
  .number({
    error: "Invoice ID must be a number.",
  })
  .int()
  .positive("invoice ID must be a positive number.");

export const getAllInvoices = async (req, res, next) => {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: {
        id: "asc",
      },
    });

    res.json(invoices);
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req, res, next) => {
  try {
    const id = invoiceIdSchema.safeParse(req.params.id);

    if (!id.success) {
      const error = new Error(id.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const invoice = await prisma.invoice.findUnique({
      where: {
        id: id.data,
      },
    });

    if (!invoice) {
      const error = new Error("Invoice not found.");
      error.statusCode = 404;
      throw error;
    }

    res.json(invoice);
  } catch (error) {
    next(error);
  }
};

export const createNewInvoice = async (req, res, next) => {
  try {
    const isOfferInvoice = req.body.offerId !== undefined;

    const result = isOfferInvoice
      ? createInvoiceFromOfferSchema.safeParse(req.body)
      : createDirectInvoiceSchema.safeParse(req.body);

    if (!result.success) {
      const error = new Error(result.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    // INVOICE CREATED FROM AN OFFER
    if (isOfferInvoice) {
      const { offerId } = result.data;

      const offer = await prisma.offer.findUnique({
        where: {
          id: offerId,
        },
        include: {
          company: true,
          contact: true,
          salesUser: true,
        },
      });

      if (!offer) {
        const error = new Error("Offer not found.");
        error.statusCode = 404;
        throw error;
      }

      if (offer.status !== "ACCEPTED") {
        const error = new Error(
          "An invoice can only be created from an accepted offer.",
        );
        error.statusCode = 400;
        throw error;
      }

      const newInvoiceFromOffer = await prisma.invoice.create({
        data: {
          offerId: offer.id,

          companyId: offer.companyId,
          contactId: offer.contactId,
          salesUserId: offer.salesUserId,

          companyName: offer.company.name,
          contactName: offer.contact?.name ?? null,
          salesUserName: offer.salesUser.name,

          description: offer.description,
          amount: offer.amount,
        },
      });

      return res.status(201).json(newInvoiceFromOffer);
    }

    // DIRECT INVOICE
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
      const error = new Error(
        "Only admins can assign another sales user.",
      );
      error.statusCode = 403;
      throw error;
    }

    const salesUserId =
      req.user.role === "ADMIN" &&
      requestedSalesUserId !== undefined
        ? requestedSalesUserId
        : req.user.userId;

    const company = await prisma.company.findUnique({
      where: {
        id: companyId,
      },
    });

    if (!company) {
      const error = new Error("Company not found.");
      error.statusCode = 404;
      throw error;
    }

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

    const salesUser = await prisma.user.findUnique({
      where: {
        id: salesUserId,
      },
    });

    if (!salesUser) {
      const error = new Error("Sales user not found.");
      error.statusCode = 404;
      throw error;
    }

    const newDirectInvoice = await prisma.invoice.create({
      data: {
        companyId,
        contactId: contact?.id ?? null,
        salesUserId,

        companyName: company.name,
        contactName: contact?.name ?? null,
        salesUserName: salesUser.name,

        description,
        amount,
      },
    });

    return res.status(201).json(newDirectInvoice);
  } catch (error) {
    next(error);
  }
};

export const updateInvoice = async (req, res, next) => {
  try {
    const result = updateInvoiceSchema.safeParse(req.body);

    if (!result.success) {
      const error = new Error(result.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const id = invoiceIdSchema.safeParse(req.params.id);

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
      const error = new Error("Only admins can reassign an invoice.");
      error.statusCode = 403;
      throw error;
    }

    const existingInvoice = await prisma.invoice.findUnique({
      where: {
        id: id.data,
      },
    });

    if (!existingInvoice) {
      const error = new Error("Invoice not found.");
      error.statusCode = 404;
      throw error;
    }

    const effectiveCompanyId =
      companyId ?? existingInvoice.companyId;

    const effectiveContactId =
      contactId !== undefined
        ? contactId
        : existingInvoice.contactId;

    const invoiceUpdates = {
      description,
      amount,
      status,
    };

    // COMPANY CHANGE
    if (companyId !== undefined) {
      const company = await prisma.company.findUnique({
        where: {
          id: companyId,
        },
      });

      if (!company) {
        const error = new Error("Company not found.");
        error.statusCode = 404;
        throw error;
      }

      invoiceUpdates.companyId = companyId;
      invoiceUpdates.companyName = company.name;
    }

    // CONTACT CHECK / CHANGE
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

      if (contactId !== undefined) {
        invoiceUpdates.contactId = contact.id;
        invoiceUpdates.contactName = contact.name;
      }
    }

    // ADMIN CAN REASSIGN RESPONSIBLE USER
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

      invoiceUpdates.salesUserId = assignedUser.id;
      invoiceUpdates.salesUserName = assignedUser.name;
    }

    const updatedInvoice = await prisma.invoice.update({
      where: {
        id: id.data,
      },
      data: invoiceUpdates,
    });

    res.json(updatedInvoice);
  } catch (error) {
    if (error.code === "P2025") {
      error.statusCode = 404;
      error.message = "Invoice not found.";
    }

    next(error);
  }
};