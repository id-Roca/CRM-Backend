import prisma from "../prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";

const loginSchema = z.object({
  email: z.email("Invalid email address.").max(100),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const login = async (req, res, next) => {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      const error = new Error(result.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const { email, password } = result.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      const error = new Error("Invalid credentials.");
      error.statusCode = 401;
      throw error;
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      const error = new Error("Invalid credentials.");
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
