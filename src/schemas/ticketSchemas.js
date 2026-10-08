import { z } from "zod";

export const createTicketSchema = z
  .object({
    subject: z
      .string()
      .min(3, "Subject must be at least 3 characters.")
      .max(50),
    description: z
      .string()
      .min(3, "Description must be at least 3 characters."),
    status: z
      .enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"])
      .optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    companyId: z.number().int().positive(),
    contactId: z.number().int().positive(),
    offerId: z.number().int().positive().optional(),
    invoiceId: z.number().int().positive().optional(),
    assignedUserId: z.number().int().positive().optional(),
  })
  .strict();

export const ticketIdSchema = z.coerce
  .number({
    error: "Ticket ID must be a number.",
  })
  .int()
  .positive("Ticket ID must be a positive number.");

export const updateTicketSchema = z
  .object({
    subject: z
      .string()
      .min(3, "Subject must be at least 3 characters.")
      .max(50)
      .optional(),
    description: z
      .string()
      .min(3, "Description must be at least 3 characters.")
      .optional(),
    status: z
      .enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"])
      .optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    offerId: z.number().int().positive().nullable().optional(),
    invoiceId: z.number().int().positive().nullable().optional(),
    assignedUserId: z.number().int().positive().nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required.",
  });

export const ticketFilterSchema = z.object({
  status: z
    .enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"], {
      error: "Status must be OPEN, IN_PROGRESS, WAITING, RESOLVED, or CLOSED.",
    })
    .optional(),
  priority: z
    .enum(["LOW", "MEDIUM", "HIGH", "URGENT"], {
      error: "Priority must be LOW, MEDIUM, HIGH, OR URGENT.",
    })
    .optional(),
  assignedUserId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
});
