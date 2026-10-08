import prisma from "../prisma.js";
import {
  createTicketSchema,
  updateTicketSchema,
  ticketIdSchema,
  ticketFilterSchema,
} from "../schemas/ticketSchemas.js";

import {
  getValidOfferForTicket,
  getValidInvoiceForTicket,
  buildTicketCreateData,
  ticketDetailSelect,
  validateCompanyAndContact,
  validateAssignedUser,
} from "../helpers/ticketHelpers.js";

export const getAllTickets = async (req, res, next) => {
  try {
    const result = ticketFilterSchema.safeParse(req.query);

    if (!result.success) {
      const error = new Error(result.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const { status, priority, assignedUserId, page, limit } = result.data;

    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status }),
      ...(priority && { priority }),
      ...(assignedUserId && { assignedUserId }),
    };

    const totalItems = await prisma.ticket.count({
      where,
    });

    const tickets = await prisma.ticket.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: "asc" },
    });

    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      data: tickets,
      page,
      limit,
      totalItems,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

export const getTicketById = async (req, res, next) => {
  try {
    const id = ticketIdSchema.safeParse(req.params.id);

    if (!id.success) {
      const error = new Error(id.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const ticket = await prisma.ticket.findUnique({
      where: {
        id: id.data,
      },
      select: {
        id: true,
        subject: true,
        description: true,
        status: true,
        priority: true,
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
        offer: {
          select: {
            id: true,
            description: true,
          },
        },

        invoice: {
          select: {
            id: true,
            description: true,
          },
        },

        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },

        assignedUser: {
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

    if (!ticket) {
      const error = new Error("Ticket not found.");
      error.statusCode = 404;
      throw error;
    }

    res.json(ticket);
  } catch (error) {
    next(error);
  }
};

export const createNewTicket = async (req, res, next) => {
  try {
    const result = createTicketSchema.safeParse(req.body);

    if (!result.success) {
      const error = new Error(result.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const {
      subject,
      description,
      status,
      priority,
      companyId,
      contactId,
      offerId,
      invoiceId,
      assignedUserId: requestedAssignedUserId,
    } = result.data;

    // Only ADMIN and SUPPORT can create tickets
    if (!["ADMIN", "SUPPORT"].includes(req.user.role)) {
      const error = new Error(
        "Only admin and support users can create tickets.",
      );
      error.statusCode = 403;
      throw error;
    }

    const createdById = req.user.userId;

    // SUPPORT defaults to assigning the ticket to themselves.
    // ADMIN may leave the ticket unassigned.
    const assignedUserId =
      requestedAssignedUserId !== undefined
        ? requestedAssignedUserId
        : req.user.role === "SUPPORT"
          ? req.user.userId
          : null;

    await validateCompanyAndContact(companyId, contactId);

    // OPTIONAL OFFER
    if (offerId !== undefined) {
      await getValidOfferForTicket(offerId, companyId, contactId);
    }

    // OPTIONAL INVOICE
    if (invoiceId !== undefined) {
      await getValidInvoiceForTicket(invoiceId, companyId, contactId);
    }

    await validateAssignedUser(assignedUserId);

    const newTicket = await prisma.ticket.create({
      data: buildTicketCreateData({
        subject,
        description,
        status,
        priority,
        companyId,
        contactId,
        createdById,
        offerId,
        invoiceId,
        assignedUserId,
      }),

      select: ticketDetailSelect,
    });

    res.status(201).json(newTicket);
  } catch (error) {
    next(error);
  }
};

export const updateTicket = async (req, res, next) => {
  try {
    const result = updateTicketSchema.safeParse(req.body);

    if (!result.success) {
      const error = new Error(result.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const id = ticketIdSchema.safeParse(req.params.id);

    if (!id.success) {
      const error = new Error(id.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const {
      subject,
      description,
      status,
      priority,
      offerId,
      invoiceId,
      assignedUserId,
    } = result.data;

    // The existing ticket is needed because companyId and contactId
    // are fixed after creation.
    const existingTicket = await prisma.ticket.findUnique({
      where: {
        id: id.data,
      },
    });

    if (!existingTicket) {
      const error = new Error("Ticket not found.");
      error.statusCode = 404;
      throw error;
    }

    const ticketUpdates = {
      subject,
      description,
      status,
      priority,
    };

// OPTIONAL ASSIGNMENT
if (assignedUserId !== undefined) {
  if (assignedUserId === null) {
    ticketUpdates.assignedUser = {
      disconnect: true,
    };
  } else {
    await validateAssignedUser(assignedUserId);

    ticketUpdates.assignedUser = {
      connect: {
        id: assignedUserId,
      },
    };
  }
}

    // OPTIONAL OFFER
    if (offerId !== undefined) {
      if (offerId === null) {
        ticketUpdates.offer = {
          disconnect: true,
        };
      } else {
        await getValidOfferForTicket(
          offerId,
          existingTicket.companyId,
          existingTicket.contactId,
          "ticket",
        );

        ticketUpdates.offer = {
          connect: {
            id: offerId,
          },
        };
      }
    }

    // OPTIONAL INVOICE
    if (invoiceId !== undefined) {
      if (invoiceId === null) {
        ticketUpdates.invoice = {
          disconnect: true,
        };
      } else {
        await getValidInvoiceForTicket(
          invoiceId,
          existingTicket.companyId,
          existingTicket.contactId,
          "ticket",
        );

        ticketUpdates.invoice = {
          connect: {
            id: invoiceId,
          },
        };
      }
    }

    const updatedTicket = await prisma.ticket.update({
      where: {
        id: id.data,
      },
      data: ticketUpdates,
      select: ticketDetailSelect,
    });

    res.json(updatedTicket);
  } catch (error) {
    if (error.code === "P2025") {
      error.statusCode = 404;
      error.message = "Ticket not found.";
    }

    next(error);
  }
};
