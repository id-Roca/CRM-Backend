import prisma from "../prisma.js";
import { z } from "zod";

const createCompanySchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters.").max(50),
    industry: z.string().min(3, "Industry must be at least 3 characters."),
  })
  .strict();

const updateCompanySchema = z
  .object({
    name: z
      .string()
      .min(3, "Name must be at least 3 characters.")
      .max(50)
      .optional(),

    industry: z
      .string()
      .min(3, "Industry must be at least 3 characters.")
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required.",
  });

const companyIdSchema = z.coerce
  .number({
    error: "Company ID must be a number.",
  })
  .int()
  .positive("Company ID must be a positive number.");

const companySearchSchema = z
  .object({
    search: z
      .string()
      .trim()
      .min(1, "Search must contain at least one character.")
      .optional(),
  })
  .strict();

export const getAllCompanies = async (req, res, next) => {
  try {
    const result = companySearchSchema.safeParse(req.query);

    if (!result.success) {
      const error = new Error(result.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const { search } = result.data;

    const companies = await prisma.company.findMany({
      where: {
        ...(search && {
          name: {
            contains: search,
            mode: "insensitive",
          },
        }),
      },
      orderBy: {
        id: "asc",
      },
    });
    res.json(companies);
  } catch (error) {
    next(error);
  }
};

export const getCompaniesById = async (req, res, next) => {
  try {
    const id = companyIdSchema.safeParse(req.params.id);

    if (!id.success) {
      const error = new Error(id.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }
    const company = await prisma.company.findUnique({
      where: {
        id: id.data,
      },
    });

    if (!company) {
      const error = new Error("Company not found.");
      error.statusCode = 404;
      throw error;
    }
    res.json(company);
  } catch (error) {
    next(error);
  }
};

export const createNewCompany = async (req, res, next) => {
  try {
    const result = createCompanySchema.safeParse(req.body);

    if (!result.success) {
      const error = new Error(result.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const { name, industry } = result.data;

    const newCompany = await prisma.company.create({
      data: {
        name,
        industry,
      },
    });

    res.status(201).json(newCompany);
  } catch (error) {
    if (error.code === "P2002") {
      error.statusCode = 409;
      error.message = "A company with this name already exists.";
    }

    next(error);
  }
};

export const updateCompany = async (req, res, next) => {
  try {
    const result = updateCompanySchema.safeParse(req.body);
    if (!result.success) {
      const error = new Error(result.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const id = companyIdSchema.safeParse(req.params.id);

    if (!id.success) {
      const error = new Error(id.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const { name, industry } = result.data;

    const updatedCompany = await prisma.company.update({
      where: {
        id: id.data,
      },
      data: {
        name,
        industry,
      },
    });

    res.json(updatedCompany);
  } catch (error) {
    if (error.code === "P2002") {
      error.statusCode = 409;
      error.message = "A company with this name already exists.";
    }

    if (error.code === "P2025") {
      error.statusCode = 404;
      error.message = "No record was found for an update.";
    }

    next(error);
  }
};

export const deleteCompany = async (req, res, next) => {
  try {
    const id = companyIdSchema.safeParse(req.params.id);

    if (!id.success) {
      const error = new Error(id.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    await prisma.company.delete({ where: { id: id.data } });

    res.status(204).end();
  } catch (err) {
    if (err.code === "P2025") {
      err.statusCode = 404;
      err.message = "Company not found.";
    }

    if (err.code === "P2003") {
      err.statusCode = 409;
      err.message = "Cannot delete a company that still has contacts.";
    }

    next(err);
  }
};
