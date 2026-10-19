import prisma from "../prisma.js";

const conflict = (message) => {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
};

// All writers that establish or change these relationships must participate.
// Retrying the whole transaction rechecks relationships against fresh data.
export const withRelationshipTransaction = async (operation) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: "Serializable",
      });
    } catch (error) {
      if (error.code !== "P2034") throw error;
      if (attempt === 2) {
        throw conflict(
          "Related records changed concurrently. Please retry the request.",
        );
      }
    }
  }
};

export const assertContactCompanyChange = async (db, contactId, companyId) => {
  for (const model of ["ticket", "offer", "invoice"]) {
    const linkedRecord = await db[model].findFirst({
      where: { contactId, companyId: { not: companyId } },
      select: { id: true },
    });
    if (linkedRecord) {
      throw conflict(
        `Cannot change contact company: a linked ${model} belongs to another company.`,
      );
    }
  }
};

export const assertDocumentTicketCompatibility = async (
  db,
  model,
  existing,
  companyId,
  contactId,
) => {
  if (companyId === existing.companyId && contactId === existing.contactId) return;

  const incompatibleTicket = await db.ticket.findFirst({
    where: {
      [model === "offer" ? "offerId" : "invoiceId"]: existing.id,
      OR: [
        { companyId: { not: companyId } },
        // A document without a contact remains compatible with any contact.
        ...(contactId !== null ? [{ contactId: { not: contactId } }] : []),
      ],
    },
    select: { id: true },
  });
  if (incompatibleTicket) {
    throw conflict(
      `Cannot change ${model} company or contact: it would conflict with a linked ticket.`,
    );
  }
};
