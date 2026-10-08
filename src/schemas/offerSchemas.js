import { z } from "zod";

export const createOfferSchema = z
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

export const updateOfferSchema = z
  .object({
    description: z
      .string()
      .min(3, "Description must be at least 3 characters.")
      .optional(),
    amount: z.number().positive("Amount must be greater than 0.").optional(),
    companyId: z.number().int().positive().optional(),
    contactId: z.number().int().positive().nullable().optional(),
    salesUserId: z.number().int().positive().optional(),
    status: z
      .enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "CANCELLED"])
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required.",
  });

export const offerIdSchema = z.coerce
  .number({
    error: "Offer ID must be a number.",
  })
  .int()
  .positive("Offer ID must be a positive number.");

export const offerFilterSchema = z
  .object({
    status: z
      .enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "CANCELLED"], {
        error: "Status must be DRAFT, SENT, ACCEPTED, REJECTED or CANCELLED.",
      })
      .optional(),
    companyId: z.coerce.number().int().positive().optional(),
    salesUserId: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(10),
  })
  .strict();
