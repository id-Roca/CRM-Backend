import { z } from "zod";

export const createContactSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters.").max(25),
  email: z.string().email("Invalid email address.").max(100), // z.string().z.email() <- older version. will soon not be supported any longer
  companyId: z.number().int().positive(),
});

export const updateContactSchema = z
  .object({
    name: z
      .string()
      .min(3, "Name must be at least 3 characters.")
      .max(25)
      .optional(),
    email: z.email("Invalid email address").max(100).optional(),
    companyId: z.number().int().positive().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required.",
  });

export const contactsIdSchema = z.coerce
  .number({
    error: "Contact ID must be a number.",
  })
  .int()
  .positive("Contact ID must be a positive number.");

export const contactsSearchSchema = z
  .object({
    search: z
      .string()
      .trim()
      .min(1, "Search must contain at least one character.")
      .max(50)
      .optional(),
  })
  .strict();
