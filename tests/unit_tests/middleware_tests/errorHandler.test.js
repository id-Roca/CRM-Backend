import { beforeAll, describe, expect, jest, test } from "@jest/globals";

let notFound, errorHandler;

beforeAll(async () => {
  ({ notFound, errorHandler } = await import("../../../src/middleware/errorHandler.js"));
});

describe("notFound", () => {
  test("returns the route-not-found response with status 404", () => {
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    notFound(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Route not found",
    });
  });
});

describe("errorHandler", () => {
  test("defaults to 500 and the fallback message when an error has neither", () => {
    const error = new Error();
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Internal Server Error",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
