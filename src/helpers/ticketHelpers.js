import prisma from "../prisma.js";

export const getValidOfferForTicket = async (
  offerId,
  companyId,
  contactId,
  context = "selected",
) => {
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

  if (offer.companyId !== companyId) {
    const error = new Error(
      context === "ticket"
        ? "Offer does not belong to the ticket company."
        : "Offer does not belong to the selected company.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (offer.contactId !== null && offer.contactId !== contactId) {
    const error = new Error(
      context === "ticket"
        ? "Offer does not belong to the ticket contact."
        : "Offer does not belong to the selected contact.",
    );
    error.statusCode = 400;
    throw error;
  }

  return offer;
};

export const getValidInvoiceForTicket = async (
  invoiceId,
  companyId,
  contactId,
  context = "selected",
) => {
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

  if (invoice.companyId !== companyId) {
    const error = new Error(
      context === "ticket"
        ? "Invoice does not belong to the ticket company."
        : "Invoice does not belong to the selected company.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (invoice.contactId !== null && invoice.contactId !== contactId) {
    const error = new Error(
      context === "ticket"
        ? "Invoice does not belong to the ticket contact."
        : "Invoice does not belong to the selected contact.",
    );
    error.statusCode = 400;
    throw error;
  }

  return invoice;
};

export const buildTicketCreateData = ({
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
}) => ({
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
});

export const ticketDetailSelect = {
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
};

export const validateCompanyAndContact = async (companyId, contactId) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    const error = new Error("Company not found.");
    error.statusCode = 404;
    throw error;
  }

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
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

  return { company, contact };
};

export const validateAssignedUser = async (assignedUserId) => {
  if (assignedUserId === null) {
    return;
  }

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
};