import {
  beforeAll,
  expect,
  jest,
  describe,
  test,
  beforeEach,
} from "@jest/globals";
const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.unstable_mockModule("../../../src/prisma.js", () => ({
  default: mockPrisma,
}));

const mockBcrypt = {
  hash: jest.fn(),
};

jest.unstable_mockModule("bcrypt", () => ({
  default: mockBcrypt,
}));

let getAllUsers, getUsersById, createUser, updateUser, deleteUser;

beforeAll(async () => {
  ({ getAllUsers, getUsersById, createUser, updateUser, deleteUser } =
    await import("../../../src/controllers/userControllers.js"));
});

describe("getAllUsers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test("returns all users", async () => {
    const fakeUsers = [
      {
        id: 1,
        email: "admin@crm.local",
        role: "ADMIN",
      },
    ];

    mockPrisma.user.findMany.mockResolvedValue(fakeUsers);

    const req = {};

    const res = {
      json: jest.fn(),
    };

    const next = jest.fn();
    await getAllUsers(req, res, next);

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
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

    expect(res.json).toHaveBeenCalledWith(fakeUsers);
    expect(next).not.toHaveBeenCalled();
  });
  test("forwards database error to next", async () => {
    const databaseError = new Error("Database exploded");

    mockPrisma.user.findMany.mockRejectedValue(databaseError);

    const req = {};
    const res = {
      json: jest.fn(),
    };
    const next = jest.fn();

    await getAllUsers(req, res, next);

    expect(mockPrisma.user.findMany).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(databaseError);
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe("getUsersById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test("forwards database errors to next", async () => {
    const databaseError = new Error("Database unavailable");
    mockPrisma.user.findUnique.mockRejectedValue(databaseError);

    const req = { params: { id: "1" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getUsersById(req, res, next);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    expect(next).toHaveBeenCalledWith(databaseError);
    expect(res.json).not.toHaveBeenCalled();
  });
  test("returns one user", async () => {
    const fakeUser = {
      id: 1,
      email: "admin@crm.local",
      role: "ADMIN",
    };
    mockPrisma.user.findUnique.mockResolvedValue(fakeUser);

    const req = {
      params: {
        id: "1",
      },
    };
    const res = {
      json: jest.fn(),
    };
    const next = jest.fn();
    await getUsersById(req, res, next);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    expect(res.json).toHaveBeenCalledWith(fakeUser);
    expect(next).not.toHaveBeenCalled();
  });
  test("forwards error when user ID is NOT a number", async () => {
    const req = {
      params: {
        id: "banana",
      },
    };
    const res = {
      json: jest.fn(),
    };
    const next = jest.fn();

    await getUsersById(req, res, next);

    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "User ID must be a number.",
        statusCode: 400,
      }),
    );

    expect(res.json).not.toHaveBeenCalled();
  });
  test("forwards 404 when user is not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = {
      params: {
        id: "999",
      },
    };
    const res = {
      json: jest.fn(),
    };
    const next = jest.fn();

    await getUsersById(req, res, next);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 999 },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "User not found.",
        statusCode: 404,
      }),
    );

    expect(res.json).not.toHaveBeenCalled();
  });
});

describe("createUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("forwards 400 when email is invalid", async () => {
    const req = {
      body: {
        name: "Sales User",
        email: "not-an-email",
        password: "Sales123!",
        role: "SALES",
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createUser(req, res, next);

    expect(mockBcrypt.hash).not.toHaveBeenCalled();
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid email address.",
        statusCode: 400,
      }),
    );
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when password is too short", async () => {
    const req = {
      body: {
        name: "Sales User",
        email: "sales@crm.local",
        password: "123",
        role: "SALES",
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createUser(req, res, next);

    expect(mockBcrypt.hash).not.toHaveBeenCalled();
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Password must be at least 6 characters",
        statusCode: 400,
      }),
    );
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when role is invalid", async () => {
    const req = {
      body: {
        name: "Sales User",
        email: "sales@crm.local",
        password: "Sales123!",
        role: "MANAGER",
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createUser(req, res, next);

    expect(mockBcrypt.hash).not.toHaveBeenCalled();
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when required fields are missing", async () => {
    const req = { body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createUser(req, res, next);

    expect(mockBcrypt.hash).not.toHaveBeenCalled();
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards unexpected database errors", async () => {
    const databaseError = new Error("Database unavailable");
    mockPrisma.user.create.mockRejectedValue(databaseError);
    mockBcrypt.hash.mockResolvedValue("hashed-password");

    const req = {
      body: {
        name: "Sales User",
        email: "sales@crm.local",
        password: "Sales123!",
        role: "SALES",
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createUser(req, res, next);

    expect(mockBcrypt.hash).toHaveBeenCalledWith("Sales123!", 10);
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        name: "Sales User",
        email: "sales@crm.local",
        passwordHash: "hashed-password",
        role: "SALES",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBeUndefined();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards password hashing errors without creating a user", async () => {
    const hashError = new Error("Hashing failed");
    mockBcrypt.hash.mockRejectedValueOnce(hashError);

    const req = {
      body: {
        name: "Sales User",
        email: "sales@crm.local",
        password: "Sales123!",
        role: "SALES",
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createUser(req, res, next);

    expect(mockBcrypt.hash).toHaveBeenCalledWith("Sales123!", 10);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(hashError);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
  test("creates a new user", async () => {
    const req = {
      body: {
        name: "Sales User",
        email: "sales@crm.local",
        password: "Sales123!",
        role: "SALES",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    mockBcrypt.hash.mockResolvedValue("hashed-password");

    const fakeCreadedUser = {
      id: 2,
      name: "Sales User",
      email: "sales@crm.local",
      role: "SALES",
      createdAt: new Date(),
    };

    mockPrisma.user.create.mockResolvedValue(fakeCreadedUser);

    await createUser(req, res, next);

    expect(mockBcrypt.hash).toHaveBeenCalledWith("Sales123!", 10);
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        name: "Sales User",
        email: "sales@crm.local",
        passwordHash: "hashed-password",
        role: "SALES",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(fakeCreadedUser);
    expect(next).not.toHaveBeenCalled();
  });
  test("forwards 400 when user name is invalid", async () => {
    const req = {
      body: {
        name: "Al",
        email: "sales@crm.local",
        password: "Sales123!",
        role: "SALES",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await createUser(req, res, next);

    expect(mockBcrypt.hash).not.toHaveBeenCalled();
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
      }),
    );
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
  test("forwards 409 when email already exists", async () => {
    const duplicateError = new Error();
    duplicateError.code = "P2002";

    mockPrisma.user.create.mockRejectedValue(duplicateError);

    const req = {
      body: {
        name: "Sales User",
        email: "sales@crm.local",
        password: "Sales123!",
        role: "SALES",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const next = jest.fn();

    mockBcrypt.hash.mockResolvedValue("hashed-password");

    await createUser(req, res, next);

    expect(next).toHaveBeenCalledWith(duplicateError);
    expect(duplicateError.statusCode).toBe(409);
    expect(duplicateError.message).toBe("A user with this email already exists.");
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe("updateUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("updates only the provided fields", async () => {
    const fakeUser = {
      id: 1,
      name: "Updated User",
      email: "sales@crm.local",
      role: "SALES",
    };
    mockPrisma.user.update.mockResolvedValue(fakeUser);

    const req = { params: { id: "1" }, body: { name: "Updated User" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateUser(req, res, next);

    expect(mockBcrypt.hash).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: "Updated User", email: undefined, role: undefined },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    expect(res.json).toHaveBeenCalledWith(fakeUser);
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards 400 when name is invalid", async () => {
    const req = { params: { id: "1" }, body: { name: "Al" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateUser(req, res, next);

    expect(mockBcrypt.hash).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Name must be at least 3 characters",
        statusCode: 400,
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when email is invalid", async () => {
    const req = { params: { id: "1" }, body: { email: "not-an-email" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateUser(req, res, next);

    expect(mockBcrypt.hash).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid email address.",
        statusCode: 400,
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when password is too short", async () => {
    const req = { params: { id: "1" }, body: { password: "123" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateUser(req, res, next);

    expect(mockBcrypt.hash).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Password must be at least 6 characters",
        statusCode: 400,
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when role is invalid", async () => {
    const req = { params: { id: "1" }, body: { role: "MANAGER" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateUser(req, res, next);

    expect(mockBcrypt.hash).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards unexpected database errors", async () => {
    const databaseError = new Error("Database unavailable");
    mockPrisma.user.update.mockRejectedValue(databaseError);

    const req = { params: { id: "1" }, body: { name: "Updated User" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateUser(req, res, next);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: "Updated User", email: undefined, role: undefined },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBeUndefined();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 409 when email already exists", async () => {
    const duplicateError = new Error("Unique constraint failed");
    duplicateError.code = "P2002";
    mockPrisma.user.update.mockRejectedValue(duplicateError);

    const req = { params: { id: "1" }, body: { email: "sales@crm.local" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateUser(req, res, next);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: undefined, email: "sales@crm.local", role: undefined },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    expect(next).toHaveBeenCalledWith(duplicateError);
    expect(duplicateError.statusCode).toBe(409);
    expect(duplicateError.message).toBe("A user with this email already exists.");
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards password hashing errors without updating a user", async () => {
    const hashError = new Error("Hashing failed");
    mockBcrypt.hash.mockRejectedValueOnce(hashError);

    const req = { params: { id: "1" }, body: { password: "NewPassword123!" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateUser(req, res, next);

    expect(mockBcrypt.hash).toHaveBeenCalledWith("NewPassword123!", 10);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(hashError);
    expect(res.json).not.toHaveBeenCalled();
  });

  test("updates a user", async () => {
    const req = {
      params: {
        id: "1",
      },
      body: {
        name: "Updated User",
        email: "updated@crm.local",
        password: "NewPassword123!",
        role: "SUPPORT",
      },
    };

    const res = {
      json: jest.fn(),
    };

    const next = jest.fn();

    // Pretend bcrypt successfully hashes the new password
    mockBcrypt.hash.mockResolvedValue("new-hashed-password");

    const fakeUpdatedUser = {
      id: 1,
      name: "Updated User",
      email: "updated@crm.local",
      role: "SUPPORT",
      createdAt: new Date(),
    };

    // Pretend Prisma successfully updates the user
    mockPrisma.user.update.mockResolvedValue(fakeUpdatedUser);

    await updateUser(req, res, next);

    // Check that bcrypt received the plain password
    expect(mockBcrypt.hash).toHaveBeenCalledWith("NewPassword123!", 10);

    // Check that Prisma received the converted ID and hashed password
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: {
        id: 1,
      },
      data: {
        name: "Updated User",
        email: "updated@crm.local",
        role: "SUPPORT",
        passwordHash: "new-hashed-password",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // Check that the updated user is returned
    expect(res.json).toHaveBeenCalledWith(fakeUpdatedUser);

    // No error should be forwarded
    expect(next).not.toHaveBeenCalled();
  });

  test("updates a user without changing the password", async () => {
    const req = {
      params: {
        id: "1",
      },
      body: {
        name: "Updated User",
        email: "updated@crm.local",
        role: "SUPPORT",
      },
    };

    const res = {
      json: jest.fn(),
    };

    const next = jest.fn();

    const fakeUpdatedUser = {
      id: 1,
      name: "Updated User",
      email: "updated@crm.local",
      role: "SUPPORT",
      createdAt: new Date(),
    };

    // Pretend Prisma successfully updates the user
    mockPrisma.user.update.mockResolvedValue(fakeUpdatedUser);

    await updateUser(req, res, next);

    // No password was provided, so bcrypt must not run
    expect(mockBcrypt.hash).not.toHaveBeenCalled();

    // Prisma should update the provided fields without a password hash
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        name: "Updated User",
        email: "updated@crm.local",
        role: "SUPPORT",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // Return the updated user
    expect(res.json).toHaveBeenCalledWith(fakeUpdatedUser);

    // No error should be forwarded
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards 400 when user ID is not a number", async () => {
    const req = {
      params: {
        id: "banana",
      },
      body: {
        name: "Updated User",
      },
    };

    const res = {
      json: jest.fn(),
    };

    const next = jest.fn();

    await updateUser(req, res, next);

    // Invalid ID should stop execution before Prisma
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();

    // The controller should forward a 400 error
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "User ID must be a number.",
        statusCode: 400,
      }),
    );

    // No success response should be sent
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when no update fields are provided", async () => {
    const req = {
      params: {
        id: "1",
      },
      body: {},
    };

    const res = {
      json: jest.fn(),
    };

    const next = jest.fn();

    await updateUser(req, res, next);

    // Zod should stop execution before bcrypt or Prisma
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();

    // The validation error should be forwarded as 400
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "At least one field is required.",
        statusCode: 400,
      }),
    );

    // No success response should be sent
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 404 when user is not found", async () => {
    const req = {
      params: {
        id: "999",
      },
      body: {
        name: "Updated User",
      },
    };

    const res = {
      json: jest.fn(),
    };

    const next = jest.fn();

    const notFoundError = new Error();
    notFoundError.code = "P2025";

    // Pretend Prisma cannot find the user
    mockPrisma.user.update.mockRejectedValue(notFoundError);

    await updateUser(req, res, next);

    // The controller should convert P2025 into a 404 error
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 999 },
      data: { name: "Updated User", email: undefined, role: undefined },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    expect(notFoundError.statusCode).toBe(404);
    expect(notFoundError.message).toBe("User not found.");

    // The converted error should be forwarded
    expect(next).toHaveBeenCalledWith(notFoundError);

    // No success response should be sent
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe("deleteUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("deletes a user and returns 204", async () => {
    mockPrisma.user.delete.mockResolvedValue({ id: 1 });

    const req = { params: { id: "1" } };
    const res = { status: jest.fn().mockReturnThis(), end: jest.fn() };
    const next = jest.fn();

    await deleteUser(req, res, next);

    expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalledWith();
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards 400 when user ID is not a number", async () => {
    const req = { params: { id: "banana" } };
    const res = { status: jest.fn().mockReturnThis(), end: jest.fn() };
    const next = jest.fn();

    await deleteUser(req, res, next);

    expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "User ID must be a number.",
        statusCode: 400,
      }),
    );
    expect(res.status).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });

  test("forwards 404 when user is not found", async () => {
    const notFoundError = new Error();
    notFoundError.code = "P2025";
    mockPrisma.user.delete.mockRejectedValue(notFoundError);

    const req = { params: { id: "999" } };
    const res = { status: jest.fn().mockReturnThis(), end: jest.fn() };
    const next = jest.fn();

    await deleteUser(req, res, next);

    expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 999 } });
    expect(next).toHaveBeenCalledWith(notFoundError);
    expect(notFoundError.statusCode).toBe(404);
    expect(notFoundError.message).toBe("User not found.");
    expect(res.status).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });

  test("forwards unexpected database errors", async () => {
    const databaseError = new Error("Database unavailable");
    mockPrisma.user.delete.mockRejectedValue(databaseError);

    const req = { params: { id: "1" } };
    const res = { status: jest.fn().mockReturnThis(), end: jest.fn() };
    const next = jest.fn();

    await deleteUser(req, res, next);

    expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBeUndefined();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });
});
