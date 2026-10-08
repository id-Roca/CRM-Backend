import { z } from "zod";

export const createInvoiceFromOfferSchema = z
  .object({
    offerId: z.number().int().positive(),
  })
  .strict();

export const createDirectInvoiceSchema = z
  .object({
    description: z
      .string()
      .min(3, "Description must be at least 3 characters."),
    amount: z.number().positive("Amount must be greater than 0."),
    companyId: z.number().int().positive(),
    contactId: z.number().int().positive().optional(),
    salesUserId: z.number().int().positive().optional(),
  })
  .strict();

export const updateInvoiceSchema = z
  .object({
    description: z
      .string()
      .min(3, "Description must be at least 3 characters.")
      .optional(),
    amount: z.number().positive("Amount must be greater than 0.").optional(),
    companyId: z.number().int().positive().optional(),
    contactId: z.number().int().positive().nullable().optional(),
    salesUserId: z.number().int().positive().optional(),
    status: z.enum(["DRAFT", "ISSUED", "PAID", "CANCELLED"]).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required.",
  });

export const invoiceIdSchema = z.coerce
  .number({
    error: "Invoice ID must be a number.",
  })
  .int()
  .positive("Invoice ID must be a positive number.");

export const invoiceFilterSchema = z
  .object({
    status: z
      .enum(["DRAFT", "ISSUED", "PAID", "CANCELLED"], {
        error: "Status must be DRAFT, ISSUED, PAID or CANCELLED.",
      })
      .optional(),
    companyId: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(10),
  })
  .strict();
