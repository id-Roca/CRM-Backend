import prisma from "../prisma.js";

export const validateInvoiceCompanyAndContact = async (
  companyId,
  contactId,
) => {
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

  return { company, contact };
};

export const getValidInvoiceSalesUser = async (salesUserId) => {
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

  return salesUser;
};

export const buildDirectInvoiceCreateData = ({
  description,
  amount,
  company,
  contact,
  salesUser,
}) => ({
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
});

export const getValidOfferForInvoice = async (offerId) => {
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

  return offer;
};

export const buildInvoiceFromOfferCreateData = (offer) => ({
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
});

export const getValidInvoiceContact = async (contactId, companyId) => {
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

  return contact;
};