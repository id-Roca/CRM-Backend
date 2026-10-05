import { beforeAll, describe, expect, jest, test } from "@jest/globals";

let authorizeRoles;

beforeAll(async () => {
  ({ authorizeRoles } = await import("../../../src/middleware/autorizeRoles.js"));
});

describe("authorizeRoles", () => {
  test("forwards 401 when req.user is missing", () => {
    const req = {};
    const res = {};
    const next = jest.fn();

    authorizeRoles("ADMIN")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Authentication required",
        statusCode: 401,
      }),
    );
  });

  test("forwards 403 when the user has no role", () => {
    const req = { user: { userId: 1 } };
    const res = {};
    const next = jest.fn();

    authorizeRoles("ADMIN", "SALES", "SUPPORT")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Forbidden",
        statusCode: 403,
      }),
    );
  });
});
