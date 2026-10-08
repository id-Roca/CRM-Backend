import { z } from "zod";

export const createCompanySchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters.").max(50),
    industry: z.string().min(3, "Industry must be at least 3 characters."),
  })
  .strict();

export const updateCompanySchema = z
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

export const companyIdSchema = z.coerce
  .number({
    error: "Company ID must be a number.",
  })
  .int()
  .positive("Company ID must be a positive number.");

export const companySearchSchema = z
  .object({
    search: z
      .string()
      .trim()
      .min(1, "Search must contain at least one character.")
      .optional(),
  })
  .strict();