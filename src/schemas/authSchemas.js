import { z } from "zod";

const loginSchema = z.object({
  email: z.email("Invalid email address.").max(100),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export default loginSchema;