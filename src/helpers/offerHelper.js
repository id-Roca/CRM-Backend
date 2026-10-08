import prisma from "../prisma.js";

export const getValidOfferContact = async (contactId, companyId) => {
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
    const error = new Error("Contact does not belong to the selected company.");
    error.statusCode = 400;
    throw error;
  }

  return contact;
};

export const offerDetailSelect = {
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
};

export const getValidOfferSalesUser = async (salesUserId) => {
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

  return assignedUser;
};
