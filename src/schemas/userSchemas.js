import { z } from "zod";

export const createUserSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters").max(25),
    email: z.email("Invalid email address.").max(100),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["ADMIN", "SALES", "SUPPORT"]),
  })
  .strict();

export const updateUserSchema = z
  .object({
    name: z
      .string()
      .min(3, "Name must be at least 3 characters")
      .max(25)
      .optional(),
    email: z.email("Invalid email address.").max(100).optional(),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .optional(),
    role: z.enum(["ADMIN", "SALES", "SUPPORT"]).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required.",
  });

export const userIdSchema = z.coerce
  .number({
    error: "User ID must be a number.",
  })
  .int()
  .positive("User ID must be a positive number.");
