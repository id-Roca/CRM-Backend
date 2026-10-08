import prisma from "../prisma.js";
import {
  createContactSchema,
  updateContactSchema,
  contactsIdSchema,
  contactsSearchSchema,
} from "../schemas/contactSchemas.js"

export const getAllContacts = async (req, res, next) => {
  try {
    const result = contactsSearchSchema.safeParse(req.query);
    if (!result.success) {
      const error = new Error(result.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const { search } = result.data;

    const contacts = await prisma.contact.findMany({
      where: {
        ...(search && {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }),
      },
      orderBy: {
        id: "asc",
      },
    });
    res.json(contacts);
  } catch (error) {
    next(error);
  }
};

export const getContactsById = async (req, res, next) => {
  try {
    const id = contactsIdSchema.safeParse(req.params.id);

    if (!id.success) {
      const error = new Error(id.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const contact = await prisma.contact.findUnique({
      where: {
        id: id.data,
      },
    });

    if (!contact) {
      const error = new Error("Contact not found.");
      error.statusCode = 404;
      throw error;
    }
    res.json(contact);
  } catch (error) {
    next(error);
  }
};

export const createNewContact = async (req, res, next) => {
  try {
    const result = createContactSchema.safeParse(req.body);

    if (!result.success) {
      const error = new Error(result.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }
    const { name, email, companyId } = result.data;

    const newContact = await prisma.contact.create({
      data: { name, email, companyId },
    });

    res.status(201).json(newContact);
  } catch (error) {
    if (error.code === "P2002") {
      error.statusCode = 409;
      error.message = "A contact with this email already exists.";
    }

    if (error.code === "P2003") {
      error.statusCode = 400;
      error.message = "Company does not exist.";
    }
    next(error);
  }
};

export const updateContact = async (req, res, next) => {
  try {
    const result = updateContactSchema.safeParse(req.body);

    if (!result.success) {
      const error = new Error(result.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }
    const id = contactsIdSchema.safeParse(req.params.id);

    if (!id.success) {
      const error = new Error(id.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const { name, email, companyId } = result.data;

    const updatedContact = await prisma.contact.update({
      where: {
        id: id.data,
      },
      data: {
        name,
        email,
        company:
          companyId !== undefined
            ? {
                connect: { id: Number(companyId) },
              }
            : undefined,
      },
    });

    res.json(updatedContact);
  } catch (error) {
    if (error.code === "P2002") {
      error.statusCode = 409;
      error.message = "A contact with this email already exists.";
    }

    if (error.code === "P2003") {
      error.statusCode = 400;
      error.message = "Company does not exist.";
    }

    if (error.code === "P2025") {
      error.statusCode = 404;
      error.message = "No record was found for an update.";
    }

    next(error);
  }
};

export const deleteContact = async (req, res, next) => {
  try {
    const id = contactsIdSchema.safeParse(req.params.id);
    if (!id.success) {
      const error = new Error(id.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    await prisma.contact.delete({ where: { id: id.data } });

    res.status(204).end();
  } catch (err) {
    if (err.code === "P2025") {
      err.statusCode = 404;
      err.message = "Contact not found.";
    }

    next(err);
  }
};
