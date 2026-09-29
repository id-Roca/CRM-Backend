import prisma from "../prisma.js";
import bcrypt from "bcrypt";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(25),
  email: z.email("Invalid email address.").max(100),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "SALES", "SUPPORT"]),
});

const updateUserSchema = z
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
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required.",
  });

// GET all users
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// GET users by ID
export const getUsersById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      const error = new Error("User ID must be a number.");
      error.statusCode = 400;
      throw error;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      throw error;
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// POST create user
export const createUser = async (req, res, next) => {
  try {
    const result = createUserSchema.safeParse(req.body);

    if (!result.success) {
      const error = new Error(result.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const { name, email, password, role } = result.data;

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    res.status(201).json(newUser);
  } catch (error) {
    if (error.code === "P2002") {
      error.statusCode = 409;
      error.message = "A user with this email already exists";
    }
    next(error);
  }
};

// PATCH - update user

export const updateUser = async (req, res, next) => {
  try {
    const result = updateUserSchema.safeParse(req.body);

    if (!result.success) {
      const error = new Error(result.error.issues[0].message);
      error.statusCode = 400;
      throw error;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      const error = new Error("User ID must be a number.");
      error.statusCode = 400;
      throw error;
    }

    const { name, email, password, role } = result.data;

    const data = {
      name,
      email,
      role,
    };

    if (password !== undefined) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    res.json(updatedUser);
  } catch (error) {
    if (error.code === "P2025") {
      error.statusCode = 404;
      error.message = "User not found";
    }
    next(error);
  }
};

// DELETE user

export const deleteUser = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      const error = new Error("User ID must be a number.");
      error.statusCode = 400;
      throw error;
    }

    await prisma.user.delete({
      where: { id },
    });
    res.status(204).end();
  } catch (error) {
    if (error.code === "P2025") {
      error.statusCode = 404;
      error.message = "User not found.";
    }
    next(error);
  }
};
