import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";

import request from "supertest";

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.unstable_mockModule("../../src/prisma.js", () => ({
  default: mockPrisma,
}));

const mockJwt = {
  verify: jest.fn(),
};

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: mockJwt,
}));

const mockBcrypt = {
  hash: jest.fn(),
};

jest.unstable_mockModule("bcrypt", () => ({
  default: mockBcrypt,
}));

let app;

beforeAll(async () => {
  ({ default: app } = await import("../../src/app.js"));
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/users", () => {
  test("returns users for an admin without password fields", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    const users = [{
          id: 1,
          name: "Test User",
          email: "user@example.test",
          role: "SALES",
          createdAt: "2026-01-01T00:00:00.000Z",
        }];
    mockPrisma.user.findMany.mockResolvedValueOnce(users);

    const response = await request(app)
      .get("/api/users")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(users);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  });

  test("returns 401 when no authentication token is provided", async () => {

    const response = await request(app)
      .get("/api/users")
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Authentification required.",
    });
    expect(mockJwt.verify).not.toHaveBeenCalled();
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
  });

  test("returns 401 when the token is invalid or expired", async () => {
    mockJwt.verify.mockImplementationOnce(() => {
      throw new Error("jwt expired");
    });

    const response = await request(app)
      .get("/api/users")
      .set("Authorization", "Bearer invalid-token")
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Invalid or expired token",
    });
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
  });

  test("returns 403 for a sales user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });

    const response = await request(app)
      .get("/api/users")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "Forbidden",
    });
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
  });

  test("returns 403 for a support user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SUPPORT" });

    const response = await request(app)
      .get("/api/users")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "Forbidden",
    });
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
  });

  test("returns 500 when the database findMany fails", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    mockPrisma.user.findMany.mockRejectedValueOnce(new Error("Database connection failed"));

    const response = await request(app)
      .get("/api/users")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Database connection failed",
    });
  });
});

describe("GET /api/users/:id", () => {
  test("returns one user for an admin", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    const user = {
          id: 1,
          name: "Test User",
          email: "user@example.test",
          role: "SALES",
          createdAt: "2026-01-01T00:00:00.000Z",
        };
    mockPrisma.user.findUnique.mockResolvedValueOnce(user);

    const response = await request(app)
      .get("/api/users/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(user);
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
  });

  test("returns 403 for a sales user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });

    const response = await request(app)
      .get("/api/users/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "Forbidden",
    });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
  });

  test("returns 403 for a support user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SUPPORT" });

    const response = await request(app)
      .get("/api/users/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "Forbidden",
    });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
  });

  test("returns 400 when the user ID is invalid", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });

    const response = await request(app)
      .get("/api/users/banana")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "User ID must be a number.",
    });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  test("returns 404 when the user does not exist", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);

    const response = await request(app)
      .get("/api/users/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toEqual({
      success: false,
      message: "User not found.",
    });
  });

  test("returns 500 when the database findUnique fails", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    mockPrisma.user.findUnique.mockRejectedValueOnce(new Error("Database connection failed"));

    const response = await request(app)
      .get("/api/users/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Database connection failed",
    });
  });
});

describe("POST /api/users", () => {
  test("creates a user with a hashed password and returns 201", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    mockBcrypt.hash.mockResolvedValueOnce("dummy-password-hash");
    const user = {
          id: 1,
          name: "Test User",
          email: "user@example.test",
          role: "SALES",
          createdAt: "2026-01-01T00:00:00.000Z",
        };
    mockPrisma.user.create.mockResolvedValueOnce(user);

    const response = await request(app)
      .post("/api/users")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Test User", email: "user@example.test", password: "dummy-password", role: "SALES" })
      .expect("Content-Type", /json/)
      .expect(201);

    expect(response.body).toEqual(user);
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        name: "Test User",
        email: "user@example.test",
        passwordHash: "dummy-password-hash",
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
    expect(mockBcrypt.hash).toHaveBeenCalledWith("dummy-password", 10);
  });

  test("returns 401 when no authentication token is provided", async () => {

    const response = await request(app)
      .post("/api/users")
      .send({ name: "Test User", email: "user@example.test", password: "dummy-password", role: "SALES" })
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Authentification required.",
    });
    expect(mockJwt.verify).not.toHaveBeenCalled();
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
  });

  test("returns 403 for a sales user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });

    const response = await request(app)
      .post("/api/users")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Test User", email: "user@example.test", password: "dummy-password", role: "SALES" })
      .expect("Content-Type", /json/)
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "Forbidden",
    });
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
  });

  test("returns 403 for a support user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SUPPORT" });

    const response = await request(app)
      .post("/api/users")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Test User", email: "user@example.test", password: "dummy-password", role: "SALES" })
      .expect("Content-Type", /json/)
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "Forbidden",
    });
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
  });

  test("returns 400 when the password is too short", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });

    const response = await request(app)
      .post("/api/users")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Test User", email: "user@example.test", password: "short", role: "SALES" })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Password must be at least 6 characters",
    });
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
  });

  test("returns 400 when the email is invalid", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });

    const response = await request(app)
      .post("/api/users")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Test User", email: "not-an-email", password: "dummy-password", role: "SALES" })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Invalid email address.",
    });
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
  });

  test("returns 409 when the email already exists", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    mockBcrypt.hash.mockResolvedValueOnce("dummy-password-hash");
    const prismaError = new Error("Database request failed");
    prismaError.code = "P2002";
    mockPrisma.user.create.mockRejectedValueOnce(prismaError);

    const response = await request(app)
      .post("/api/users")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Test User", email: "user@example.test", password: "dummy-password", role: "SALES" })
      .expect("Content-Type", /json/)
      .expect(409);

    expect(response.body).toEqual({
      success: false,
      message: "A user with this email already exists.",
    });
    expect(mockBcrypt.hash).toHaveBeenCalledWith("dummy-password", 10);
  });

  test("returns 500 when the database create fails", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    mockBcrypt.hash.mockResolvedValueOnce("dummy-password-hash");
    mockPrisma.user.create.mockRejectedValueOnce(new Error("Database connection failed"));

    const response = await request(app)
      .post("/api/users")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Test User", email: "user@example.test", password: "dummy-password", role: "SALES" })
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Database connection failed",
    });
  });

  test("returns 500 when password hashing fails", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    mockBcrypt.hash.mockRejectedValueOnce(new Error("Hashing failed"));

    const response = await request(app)
      .post("/api/users")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Test User", email: "user@example.test", password: "dummy-password", role: "SALES" })
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Hashing failed",
    });
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockBcrypt.hash).toHaveBeenCalledWith("dummy-password", 10);
  });

  test("rejects unexpected fields alongside valid data", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    const response = await request(app)
      .post("/api/users")
      .set("Authorization", "Bearer dummy-token")
      .send({"name":"Test User","email":"test@example.com","password":"dummy-password","role":"SALES","unexpected":"value"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/users/:id", () => {
  test("updates a password and user fields for an admin", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    mockBcrypt.hash.mockResolvedValueOnce("dummy-password-hash");
    const user = {
          id: 1,
          name: "Test User",
          email: "user@example.test",
          role: "SALES",
          createdAt: "2026-01-01T00:00:00.000Z",
        };
    mockPrisma.user.update.mockResolvedValueOnce(user);

    const response = await request(app)
      .patch("/api/users/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Test User", email: "user@example.test", password: "dummy-password", role: "SALES" })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(user);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        name: "Test User",
        email: "user@example.test",
        role: "SALES",
        passwordHash: "dummy-password-hash",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    expect(mockBcrypt.hash).toHaveBeenCalledWith("dummy-password", 10);
  });

  test("updates only supplied fields without hashing a password", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    const user = {
          id: 1,
          name: "Test User",
          email: "user@example.test",
          role: "SALES",
          createdAt: "2026-01-01T00:00:00.000Z",
        };
    mockPrisma.user.update.mockResolvedValueOnce(user);

    const response = await request(app)
      .patch("/api/users/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Test User" })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(user);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: "Test User", email: undefined, role: undefined },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
  });

  test("returns 401 when no authentication token is provided", async () => {

    const response = await request(app)
      .patch("/api/users/1")
      .send({ name: "Test User" })
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Authentification required.",
    });
    expect(mockJwt.verify).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
  });

  test("returns 403 for a sales user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });

    const response = await request(app)
      .patch("/api/users/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Test User" })
      .expect("Content-Type", /json/)
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "Forbidden",
    });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
  });

  test("returns 403 for a support user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SUPPORT" });

    const response = await request(app)
      .patch("/api/users/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Test User" })
      .expect("Content-Type", /json/)
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "Forbidden",
    });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
  });

  test("returns 400 when no update fields are provided", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });

    const response = await request(app)
      .patch("/api/users/1")
      .set("Authorization", "Bearer dummy-token")
      .send({})
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "At least one field is required.",
    });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
  });

  test("returns 400 when the new password is too short", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });

    const response = await request(app)
      .patch("/api/users/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ password: "short" })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Password must be at least 6 characters",
    });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
  });

  test("returns 400 when the user ID is invalid", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });

    const response = await request(app)
      .patch("/api/users/banana")
      .set("Authorization", "Bearer dummy-token")
      .send({ password: "dummy-password" })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "User ID must be a number.",
    });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
  });

  test("returns 404 when the user to update does not exist", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    const prismaError = new Error("Database request failed");
    prismaError.code = "P2025";
    mockPrisma.user.update.mockRejectedValueOnce(prismaError);

    const response = await request(app)
      .patch("/api/users/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Test User" })
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toEqual({
      success: false,
      message: "User not found.",
    });
  });

  test("returns 409 when the updated email already exists", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    const prismaError = new Error("Database request failed");
    prismaError.code = "P2002";
    mockPrisma.user.update.mockRejectedValueOnce(prismaError);

    const response = await request(app)
      .patch("/api/users/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ email: "user@example.test" })
      .expect("Content-Type", /json/)
      .expect(409);

    expect(response.body).toEqual({
      success: false,
      message: "A user with this email already exists.",
    });
  });

  test("returns 500 when the database update fails", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    mockPrisma.user.update.mockRejectedValueOnce(new Error("Database connection failed"));

    const response = await request(app)
      .patch("/api/users/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Test User" })
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Database connection failed",
    });
  });

  test("returns 500 when password hashing fails", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    mockBcrypt.hash.mockRejectedValueOnce(new Error("Hashing failed"));

    const response = await request(app)
      .patch("/api/users/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ password: "dummy-password" })
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Hashing failed",
    });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockBcrypt.hash).toHaveBeenCalledWith("dummy-password", 10);
  });

  test("rejects unexpected fields alongside valid data", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    const response = await request(app)
      .patch("/api/users/1")
      .set("Authorization", "Bearer dummy-token")
      .send({"name":"Updated name","unexpected":"value"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/users/:id", () => {
  test("deletes a user for an admin and returns an empty 204 response", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    mockPrisma.user.delete.mockResolvedValueOnce({ id: 1 });

    const response = await request(app)
      .delete("/api/users/1")
      .set("Authorization", "Bearer dummy-token")
      .expect(204);

    expect(response.text).toBe("");
    expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  test("returns 401 when no authentication token is provided", async () => {

    const response = await request(app)
      .delete("/api/users/1")
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Authentification required.",
    });
    expect(mockJwt.verify).not.toHaveBeenCalled();
    expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
  });

  test("returns 403 for a sales user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });

    const response = await request(app)
      .delete("/api/users/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "Forbidden",
    });
    expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
  });

  test("returns 403 for a support user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SUPPORT" });

    const response = await request(app)
      .delete("/api/users/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "Forbidden",
    });
    expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
  });

  test("returns 400 when the user ID is invalid", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });

    const response = await request(app)
      .delete("/api/users/banana")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "User ID must be a number.",
    });
    expect(mockPrisma.user.delete).not.toHaveBeenCalled();
  });

  test("returns 404 when the user to delete does not exist", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    const prismaError = new Error("Database request failed");
    prismaError.code = "P2025";
    mockPrisma.user.delete.mockRejectedValueOnce(prismaError);

    const response = await request(app)
      .delete("/api/users/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toEqual({
      success: false,
      message: "User not found.",
    });
  });

  test("returns 500 when the database delete fails", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    mockPrisma.user.delete.mockRejectedValueOnce(new Error("Database connection failed"));

    const response = await request(app)
      .delete("/api/users/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Database connection failed",
    });
  });
});
