import {
  beforeAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";

const mockJwt = {
  verify: jest.fn(),
};

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: mockJwt,
}));

let authenticateToken;

beforeAll(async () => {
  ({ authenticateToken } = await import("../../../src/middleware/authMiddleware.js"));
});

describe("authenticateToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(process, "env", {
      ...process.env,
      JWT_SECRET: "dummy-test-secret",
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("verifies the extracted token with the configured secret and attaches claims", () => {
    const decodedUser = { userId: 1, role: "ADMIN" };
    mockJwt.verify.mockReturnValueOnce(decodedUser);

    const req = { headers: { authorization: "Bearer dummy-token" } };
    const res = {};
    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(mockJwt.verify).toHaveBeenCalledTimes(1);
    expect(mockJwt.verify).toHaveBeenCalledWith("dummy-token", "dummy-test-secret");
    expect(req.user).toBe(decodedUser);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  test("forwards 401 for a non-Bearer header without verifying a token", () => {
    const req = { headers: { authorization: "Basic dummy-credentials" } };
    const res = {};
    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(mockJwt.verify).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Authentification required.",
        statusCode: 401,
      }),
    );
  });
});
