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
    contactId: z.number().int().positive().nullable().optional(),
    salesUserId: z.number().int().positive().optional(),
    status: z.enum(["DRAFT", "ISSUED", "PAID", "CANCELLED"]).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required.",
  });

const invoiceIdSchema = z.coerce
  .number({
    error: "Invoice ID must be a number.",
  })
  .int()
  .positive("Invoice ID must be a positive number.");

const invoiceFilterSchema = z
  .object({
    status: z
      .enum(["DRAFT", "ISSUED", "PAID", "CANCELLED"], {
        error: "Status must be DRAFT, ISSUED, PAID or CANCELLED.",
      })
      .optional(),
    companyId: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(10),
  })
  .strict();

export const getAllInvoices = async (req, res, next) => {
  try {
    const result = invoiceFilterSchema.safeParse(req.query);
    if (!result.success) {
      const error = new Error(result.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const { status, companyId, page, limit } = result.data;
    const skip = (page - 1) * limit;
    const where = {
      ...(status && { status }),
      ...(companyId && { companyId }),
    };

    const totalItems = await prisma.invoice.count({ where });

    const invoices = await prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        id: "asc",
      },
    });

    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      data: invoices,
      page,
      limit,
      totalItems,
      totalPages,
    });
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
      select: {
        id: true,
        description: true,
        amount: true,
        status: true,

        offer: {
          select: {
            id: true,
            description: true,
            status: true,
          },
        },

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

        companyName: true,
        contactName: true,
        salesUserName: true,

        createdAt: true,
        updatedAt: true,
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

    // INVOICE CREATED FROM AN ACCEPTED OFFER
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
          offer: {
            connect: {
              id: offer.id,
            },
          },

          company: {
            connect: {
              id: offer.companyId,
            },
          },

          ...(offer.contactId !== null && {
            contact: {
              connect: {
                id: offer.contactId,
              },
            },
          }),

          salesUser: {
            connect: {
              id: offer.salesUserId,
            },
          },

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

    // SALES users may not assign an invoice to another user.
    // ADMIN may optionally choose another user.
    if (req.user.role !== "ADMIN" && requestedSalesUserId !== undefined) {
      const error = new Error("Only admins can assign another sales user.");
      error.statusCode = 403;
      throw error;
    }

    const salesUserId =
      req.user.role === "ADMIN" && requestedSalesUserId !== undefined
        ? requestedSalesUserId
        : req.user.userId;

    // COMPANY
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

    // OPTIONAL CONTACT
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

    // SALES USER
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

    // CREATE DIRECT INVOICE
    const newDirectInvoice = await prisma.invoice.create({
      data: {
        company: {
          connect: {
            id: company.id,
          },
        },

        ...(contact !== null && {
          contact: {
            connect: {
              id: contact.id,
            },
          },
        }),

        salesUser: {
          connect: {
            id: salesUser.id,
          },
        },

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
    // VALIDATE REQUEST BODY
    const result = updateInvoiceSchema.safeParse(req.body);

    if (!result.success) {
      const error = new Error(result.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    // VALIDATE INVOICE ID
    const id = invoiceIdSchema.safeParse(req.params.id);

    if (!id.success) {
      const error = new Error(id.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    // GET VALIDATED UPDATE DATA
    const { description, amount, companyId, contactId, salesUserId, status } =
      result.data;

    // ONLY ADMIN CAN REASSIGN THE RESPONSIBLE SALES USER
    if (req.user.role !== "ADMIN" && salesUserId !== undefined) {
      const error = new Error("Only admins can reassign an invoice.");
      error.statusCode = 403;
      throw error;
    }

    // CHECK THAT THE INVOICE EXISTS
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

    // DETERMINE WHICH COMPANY SHOULD BE USED FOR RELATIONSHIP CHECKS
    //
    // If companyId was sent in the request, use the new company.
    // Otherwise, keep using the invoice's existing company.
    const effectiveCompanyId = companyId ?? existingInvoice.companyId;

    // DETERMINE WHICH CONTACT SHOULD BE USED FOR RELATIONSHIP CHECKS
    //
    // undefined = contact was not included in the request,
    //             so keep the existing contact
    //
    // number    = client wants to assign/change the contact
    //
    // null      = client wants to remove the contact
    const effectiveContactId =
      contactId !== undefined ? contactId : existingInvoice.contactId;

    // BUILD THE UPDATE OBJECT
    //
    // Fields that were not provided will be undefined.
    // Prisma ignores undefined fields in the update data.
    const invoiceUpdates = {
      description,
      amount,
      status,
    };

    // COMPANY CHANGE
    if (companyId !== undefined) {
      // Check that the requested company actually exists
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

      // Update both the relation ID and the stored company-name snapshot
      invoiceUpdates.companyId = companyId;
      invoiceUpdates.companyName = company.name;
    }

    // CONTACT REMOVE
    if (contactId === null) {
      invoiceUpdates.contactId = null;
      invoiceUpdates.contactName = null;
    }

    // CONTACT CHECK / CHANGE
    else if (effectiveContactId !== null) {
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

      // The contact must belong to the invoice's effective company
      if (contact.companyId !== effectiveCompanyId) {
        const error = new Error(
          "Contact does not belong to the selected company.",
        );
        error.statusCode = 400;
        throw error;
      }

      // Only update the contact fields if contactId was actually
      // included in the request.
      if (contactId !== undefined) {
        invoiceUpdates.contactId = contact.id;
        invoiceUpdates.contactName = contact.name;
      }
    }

    // ADMIN CAN REASSIGN RESPONSIBLE SALES USER
    if (salesUserId !== undefined) {
      // Check that the requested user exists
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

      // Update both the relation ID and stored sales-user-name snapshot
      invoiceUpdates.salesUserId = assignedUser.id;
      invoiceUpdates.salesUserName = assignedUser.name;
    }

    // UPDATE THE INVOICE
    const updatedInvoice = await prisma.invoice.update({
      where: {
        id: id.data,
      },
      data: invoiceUpdates,
    });

    // RETURN UPDATED INVOICE
    res.json(updatedInvoice);
  } catch (error) {
    if (error.code === "P2025") {
      error.statusCode = 404;
      error.message = "Invoice not found.";
    }
    next(error);
  }
};
