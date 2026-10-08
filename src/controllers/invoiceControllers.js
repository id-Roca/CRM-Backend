import prisma from "../prisma.js";
import {
  createInvoiceFromOfferSchema,
  createDirectInvoiceSchema,
  updateInvoiceSchema,
  invoiceIdSchema,
  invoiceFilterSchema,
} from "../schemas/invoiceSchemas.js";

import {
  validateInvoiceCompanyAndContact,
  getValidInvoiceSalesUser,
  buildDirectInvoiceCreateData,
  getValidOfferForInvoice,
  buildInvoiceFromOfferCreateData,
  getValidInvoiceContact,
} from "../helpers/invoiceHelpers.js";

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

      const offer = await getValidOfferForInvoice(offerId);

      const newInvoiceFromOffer = await prisma.invoice.create({
        data: buildInvoiceFromOfferCreateData(offer),
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

    // VALIDATE COMPANY AND OPTIONAL CONTACT
    const { company, contact } = await validateInvoiceCompanyAndContact(
      companyId,
      contactId,
    );

    // VALIDATE SALES USER
    const salesUser = await getValidInvoiceSalesUser(salesUserId);

    // CREATE DIRECT INVOICE
    const newDirectInvoice = await prisma.invoice.create({
      data: buildDirectInvoiceCreateData({
        description,
        amount,
        company,
        contact,
        salesUser,
      }),
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
    const effectiveCompanyId = companyId ?? existingInvoice.companyId;

    // DETERMINE WHICH CONTACT SHOULD BE USED FOR RELATIONSHIP CHECKS
    const effectiveContactId =
      contactId !== undefined ? contactId : existingInvoice.contactId;

    // BUILD THE UPDATE OBJECT
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
      const contact = await getValidInvoiceContact(
        effectiveContactId,
        effectiveCompanyId,
      );

      if (contactId !== undefined) {
        invoiceUpdates.contactId = contact.id;
        invoiceUpdates.contactName = contact.name;
      }
    }

    // ADMIN CAN REASSIGN RESPONSIBLE SALES USER
    if (salesUserId !== undefined) {
      const salesUser = await getValidInvoiceSalesUser(salesUserId);
      // Update both the relation ID and stored sales-user-name snapshot
      invoiceUpdates.salesUserId = salesUser.id;
      invoiceUpdates.salesUserName = salesUser.name;
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
