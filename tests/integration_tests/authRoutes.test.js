import {
  beforeEach,
  afterEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";

import request from "supertest";

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
};

jest.unstable_mockModule("../../src/prisma.js", () => ({
  default: mockPrisma,
}));

const mockBcrypt = {
  compare: jest.fn(),
};

jest.unstable_mockModule("bcrypt", () => ({
  default: mockBcrypt,
}));

const mockJwt = {
  sign: jest.fn(),
};

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: mockJwt,
}));

let app;

beforeEach(async () => {
  jest.clearAllMocks();
  jest.replaceProperty(process, "env", {
    ...process.env,
    JWT_SECRET: "dummy-test-secret",
  });
  // Each test gets fresh real rate limiters instead of sharing request counts.
  jest.resetModules();
  ({ default: app } = await import("../../src/app.js"));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("POST /api/auth/login", () => {
  test("returns a token and public user data for valid credentials", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 1,
      name: "Test User",
      email: "user@example.test",
      role: "SALES",
      passwordHash: "dummy-password-hash",
    });
    mockBcrypt.compare.mockResolvedValueOnce(true);
    mockJwt.sign.mockReturnValueOnce("dummy-token");

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.test", password: "dummy-password" })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      message: "Login successful.",
      token: "dummy-token",
      user: {
        id: 1,
        name: "Test User",
        email: "user@example.test",
        role: "SALES",
      },
    });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.test" },
    });
    expect(mockBcrypt.compare).toHaveBeenCalledWith(
      "dummy-password",
      "dummy-password-hash",
    );
    expect(mockJwt.sign).toHaveBeenCalledWith(
      { userId: 1, role: "SALES" },
      "dummy-test-secret",
      { expiresIn: "1h" },
    );
  });

  test("returns 400 when the email is invalid", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: "dummy-password" })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Invalid email address.",
    });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
    expect(mockJwt.sign).not.toHaveBeenCalled();
  });

  test("returns 400 when the password is too short", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.test", password: "short" })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Password must be at least 6 characters.",
    });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
    expect(mockJwt.sign).not.toHaveBeenCalled();
  });

  test("returns 401 when the user does not exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.test", password: "dummy-password" })
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Invalid credentials.",
    });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.test" },
    });
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
    expect(mockJwt.sign).not.toHaveBeenCalled();
  });

  test("returns 401 when the password does not match", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 1,
      passwordHash: "dummy-password-hash",
    });
    mockBcrypt.compare.mockResolvedValueOnce(false);

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.test", password: "dummy-password" })
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Invalid credentials.",
    });
    expect(mockBcrypt.compare).toHaveBeenCalledWith(
      "dummy-password",
      "dummy-password-hash",
    );
    expect(mockJwt.sign).not.toHaveBeenCalled();
  });

  test("returns 500 when the database query fails", async () => {
    mockPrisma.user.findUnique.mockRejectedValueOnce(
      new Error("Database connection failed"),
    );

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.test", password: "dummy-password" })
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Database connection failed",
    });
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
    expect(mockJwt.sign).not.toHaveBeenCalled();
  });

  test("returns 500 when password comparison fails", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 1,
      passwordHash: "dummy-password-hash",
    });
    mockBcrypt.compare.mockRejectedValueOnce(new Error("Comparison failed"));

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.test", password: "dummy-password" })
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Comparison failed",
    });
    expect(mockJwt.sign).not.toHaveBeenCalled();
  });

  test("returns 500 when JWT signing fails", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 1,
      role: "SALES",
      passwordHash: "dummy-password-hash",
    });
    mockBcrypt.compare.mockResolvedValueOnce(true);
    mockJwt.sign.mockImplementationOnce(() => {
      throw new Error("Signing failed");
    });

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.test", password: "dummy-password" })
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Signing failed",
    });
  });

  test("returns 429 after five login requests from the same client", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app)
        .post("/api/auth/login")
        .send({ email: "not-an-email", password: "dummy-password" })
        .expect(400);
    }

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.test", password: "dummy-password" })
      .expect("Content-Type", /json/)
      .expect(429);

    expect(response.body).toEqual({
      success: false,
      message: "Too many login attempts, please try again later.",
    });
    expect(Number(response.headers["retry-after"])).toBeGreaterThan(0);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
    expect(mockJwt.sign).not.toHaveBeenCalled();
  });
});
