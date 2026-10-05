import {
  beforeAll,
  expect,
  jest,
  describe,
  test,
  beforeEach,
  afterEach,
} from "@jest/globals";

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
};

jest.unstable_mockModule("../../../src/prisma.js", () => ({
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

let login;

beforeAll(async () => {
  ({ login } = await import("../../../src/controllers/authControllers.js"));
});

describe("login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(process, "env", {
      JWT_SECRET: "dummy-test-secret",
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("returns a token and user data when credentials are valid", async () => {
    const fakeUser = {
      id: 1,
      name: "Test User",
      email: "user@example.test",
      role: "SALES",
      passwordHash: "dummy-password-hash",
    };
    mockPrisma.user.findUnique.mockResolvedValueOnce(fakeUser);
    mockBcrypt.compare.mockResolvedValueOnce(true);
    mockJwt.sign.mockReturnValueOnce("dummy-token");

    const req = {
      body: { email: "user@example.test", password: "dummy-password" },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await login(req, res, next);

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
    expect(res.json).toHaveBeenCalledWith({
      message: "Login successful.",
      token: "dummy-token",
      user: {
        id: 1,
        name: "Test User",
        email: "user@example.test",
        role: "SALES",
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards 400 when email is invalid", async () => {
    const req = {
      body: { email: "not-an-email", password: "dummy-password" },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await login(req, res, next);

    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
    expect(mockJwt.sign).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid email address.",
        statusCode: 400,
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when email exceeds 100 characters", async () => {
    const req = {
      body: {
        email: `${"a".repeat(50)}@${"b".repeat(50)}.test`,
        password: "dummy-password",
      },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await login(req, res, next);

    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
    expect(mockJwt.sign).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when password is too short", async () => {
    const req = {
      body: { email: "user@example.test", password: "short" },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await login(req, res, next);

    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
    expect(mockJwt.sign).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Password must be at least 6 characters.",
        statusCode: 400,
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when required credentials are missing", async () => {
    const req = { body: {} };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await login(req, res, next);

    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
    expect(mockJwt.sign).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 401 when user is not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);

    const req = {
      body: { email: "user@example.test", password: "dummy-password" },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await login(req, res, next);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.test" },
    });
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
    expect(mockJwt.sign).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid credentials.",
        statusCode: 401,
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 401 when password does not match", async () => {
    const fakeUser = {
      id: 1,
      email: "user@example.test",
      passwordHash: "dummy-password-hash",
    };
    mockPrisma.user.findUnique.mockResolvedValueOnce(fakeUser);
    mockBcrypt.compare.mockResolvedValueOnce(false);

    const req = {
      body: { email: "user@example.test", password: "dummy-password" },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await login(req, res, next);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.test" },
    });
    expect(mockBcrypt.compare).toHaveBeenCalledWith(
      "dummy-password",
      "dummy-password-hash",
    );
    expect(mockJwt.sign).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid credentials.",
        statusCode: 401,
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards database errors to next", async () => {
    const databaseError = new Error("Database unavailable");
    mockPrisma.user.findUnique.mockRejectedValueOnce(databaseError);

    const req = {
      body: { email: "user@example.test", password: "dummy-password" },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await login(req, res, next);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.test" },
    });
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
    expect(mockJwt.sign).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBeUndefined();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards password comparison errors to next", async () => {
    const comparisonError = new Error("Comparison failed");
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 1,
      email: "user@example.test",
      passwordHash: "dummy-password-hash",
    });
    mockBcrypt.compare.mockRejectedValueOnce(comparisonError);

    const req = {
      body: { email: "user@example.test", password: "dummy-password" },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await login(req, res, next);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.test" },
    });
    expect(mockBcrypt.compare).toHaveBeenCalledWith(
      "dummy-password",
      "dummy-password-hash",
    );
    expect(mockJwt.sign).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(comparisonError);
    expect(comparisonError.statusCode).toBeUndefined();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards JWT signing errors to next", async () => {
    const signingError = new Error("Signing failed");
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 1,
      email: "user@example.test",
      role: "SALES",
      passwordHash: "dummy-password-hash",
    });
    mockBcrypt.compare.mockResolvedValueOnce(true);
    mockJwt.sign.mockImplementationOnce(() => {
      throw signingError;
    });

    const req = {
      body: { email: "user@example.test", password: "dummy-password" },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await login(req, res, next);

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
    expect(next).toHaveBeenCalledWith(signingError);
    expect(signingError.statusCode).toBeUndefined();
    expect(res.json).not.toHaveBeenCalled();
  });
});
