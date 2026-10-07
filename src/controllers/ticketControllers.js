import prisma from "../prisma.js";
import { z } from "zod";

const createTicketSchema = z
  .object({
    subject: z
      .string()
      .min(3, "Subject must be at least 3 characters.")
      .max(50),
    description: z
      .string()
      .min(3, "Description must be at least 3 characters."),
    status: z
      .enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"])
      .optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    companyId: z.number().int().positive(),
    contactId: z.number().int().positive(),
    offerId: z.number().int().positive().optional(),
    invoiceId: z.number().int().positive().optional(),
    assignedUserId: z.number().int().positive().optional(),
  })
  .strict();

const ticketIdSchema = z.coerce
  .number({
    error: "Ticket ID must be a number.",
  })
  .int()
  .positive("Ticket ID must be a positive number.");

const updateTicketSchema = z
  .object({
    subject: z
      .string()
      .min(3, "Subject must be at least 3 characters.")
      .max(50)
      .optional(),
    description: z
      .string()
      .min(3, "Description must be at least 3 characters.")
      .optional(),
    status: z
      .enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"])
      .optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    offerId: z.number().int().positive().nullable().optional(),
    invoiceId: z.number().int().positive().nullable().optional(),
    assignedUserId: z.number().int().positive().nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required.",
  });

const ticketFilterSchema = z.object({
  status: z
    .enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"], {
      error: "Status must be OPEN, IN_PROGRESS, WAITING, RESOLVED, or CLOSED.",
    })
    .optional(),
  priority: z
    .enum(["LOW", "MEDIUM", "HIGH", "URGENT"], {
      error: "Priority must be LOW, MEDIUM, HIGH, OR URGENT.",
    })
    .optional(),
  assignedUserId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
});

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

    // CONTACT
    const contact = await prisma.contact.findUnique({
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

    // OPTIONAL OFFER
    let offer = null;

    if (offerId !== undefined) {
      offer = await prisma.offer.findUnique({
        where: {
          id: offerId,
        },
      });

      if (!offer) {
        const error = new Error("Offer not found.");
        error.statusCode = 404;
        throw error;
      }

      if (offer.companyId !== companyId) {
        const error = new Error(
          "Offer does not belong to the selected company.",
        );
        error.statusCode = 400;
        throw error;
      }

      if (offer.contactId !== null && offer.contactId !== contactId) {
        const error = new Error(
          "Offer does not belong to the selected contact.",
        );
        error.statusCode = 400;
        throw error;
      }
    }

    // OPTIONAL INVOICE
    let invoice = null;

    if (invoiceId !== undefined) {
      invoice = await prisma.invoice.findUnique({
        where: {
          id: invoiceId,
        },
      });

      if (!invoice) {
        const error = new Error("Invoice not found.");
        error.statusCode = 404;
        throw error;
      }

      if (invoice.companyId !== companyId) {
        const error = new Error(
          "Invoice does not belong to the selected company.",
        );
        error.statusCode = 400;
        throw error;
      }

      if (invoice.contactId !== null && invoice.contactId !== contactId) {
        const error = new Error(
          "Invoice does not belong to the selected contact.",
        );
        error.statusCode = 400;
        throw error;
      }
    }

    // OPTIONAL ASSIGNED USER
    if (assignedUserId !== null) {
      const assignedUser = await prisma.user.findUnique({
        where: {
          id: assignedUserId,
        },
      });

      if (!assignedUser) {
        const error = new Error("Assigned user not found.");
        error.statusCode = 404;
        throw error;
      }
    }

    const newTicket = await prisma.ticket.create({
      data: {
        subject,
        description,
        status,
        priority,

        company: {
          connect: {
            id: companyId,
          },
        },

        contact: {
          connect: {
            id: contactId,
          },
        },

        createdBy: {
          connect: {
            id: createdById,
          },
        },

        ...(offerId !== undefined && {
          offer: {
            connect: {
              id: offerId,
            },
          },
        }),

        ...(invoiceId !== undefined && {
          invoice: {
            connect: {
              id: invoiceId,
            },
          },
        }),

        ...(assignedUserId !== null && {
          assignedUser: {
            connect: {
              id: assignedUserId,
            },
          },
        }),
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

    // OPTIONAL OFFER
    if (offerId !== undefined) {
      if (offerId === null) {
        ticketUpdates.offer = {
          disconnect: true,
        };
      } else {
        const offer = await prisma.offer.findUnique({
          where: {
            id: offerId,
          },
        });

        if (!offer) {
          const error = new Error("Offer not found.");
          error.statusCode = 404;
          throw error;
        }

        if (offer.companyId !== existingTicket.companyId) {
          const error = new Error(
            "Offer does not belong to the ticket company.",
          );
          error.statusCode = 400;
          throw error;
        }

        if (
          offer.contactId !== null &&
          offer.contactId !== existingTicket.contactId
        ) {
          const error = new Error(
            "Offer does not belong to the ticket contact.",
          );
          error.statusCode = 400;
          throw error;
        }

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
        const invoice = await prisma.invoice.findUnique({
          where: {
            id: invoiceId,
          },
        });

        if (!invoice) {
          const error = new Error("Invoice not found.");
          error.statusCode = 404;
          throw error;
        }

        if (invoice.companyId !== existingTicket.companyId) {
          const error = new Error(
            "Invoice does not belong to the ticket company.",
          );
          error.statusCode = 400;
          throw error;
        }

        if (
          invoice.contactId !== null &&
          invoice.contactId !== existingTicket.contactId
        ) {
          const error = new Error(
            "Invoice does not belong to the ticket contact.",
          );
          error.statusCode = 400;
          throw error;
        }

        ticketUpdates.invoice = {
          connect: {
            id: invoiceId,
          },
        };
      }
    }

    // OPTIONAL ASSIGNMENT
    if (assignedUserId !== undefined) {
      if (assignedUserId === null) {
        ticketUpdates.assignedUser = {
          disconnect: true,
        };
      } else {
        const assignedUser = await prisma.user.findUnique({
          where: {
            id: assignedUserId,
          },
        });

        if (!assignedUser) {
          const error = new Error("Assigned user not found.");
          error.statusCode = 404;
          throw error;
        }

        ticketUpdates.assignedUser = {
          connect: {
            id: assignedUserId,
          },
        };
      }
    }

    const updatedTicket = await prisma.ticket.update({
      where: {
        id: id.data,
      },
      data: ticketUpdates,
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

    res.json(updatedTicket);
  } catch (error) {
    if (error.code === "P2025") {
      error.statusCode = 404;
      error.message = "Ticket not found.";
    }

    next(error);
  }
};
