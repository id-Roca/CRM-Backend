import { beforeAll, expect, jest, test } from "@jest/globals";
import { json } from "zod";
// import { email, json } from "zod";

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.unstable_mockModule("../src/prisma.js", () => ({
  default: mockPrisma,
}));

const mockBcrypt = {
  hash: jest.fn(),
};

jest.unstable_mockModule("bcrypt", () => ({
  default: mockBcrypt,
}));

beforeAll( async ()=> {
  ({getAllUsers, getUsersById, createUser, updateUser} 
    = await import("../src/userControllers/userControllers.js"));
  })


describe("getUsersById", () => {
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
    expect(mockPrisma.user.findUnique).toHaveBeenCalled();
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
        id: 999,
      },
    };
    const res = {
      json: jest.fn(),
    };
    const next = jest.fn();

    await getUsersById(req, res, next);

    expect(mockPrisma.user.findUnique).toHaveBeenCalled();

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
  test("forwards 400 when user data is invalud", async () => {
    const req = {
      body: {
        name: "Al",
        email: "not-an-email",
        password: "123",
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
  });
});

describe("updateUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(mockBcrypt.hash).toHaveBeenCalledWith(
      "NewPassword123!",
      10,
    );

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

    // Prisma should still update the user
    expect(mockPrisma.user.update).toHaveBeenCalled();

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

  test("forwards 400 when update data is invalid", async () => {
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
    expect(notFoundError.statusCode).toBe(404);
    expect(notFoundError.message).toBe("User not found");

    // The converted error should be forwarded
    expect(next).toHaveBeenCalledWith(notFoundError);

    // No success response should be sent
    expect(res.json).not.toHaveBeenCalled();
  });
});