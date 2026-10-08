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
  contact: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  offer: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
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

let app;

beforeAll(async () => {
  ({ default: app } = await import("../../src/app.js"));
});

beforeEach(() => {
  jest.resetAllMocks();
});

describe("GET /api/offers", () => {
  beforeEach(() => {
    mockPrisma.offer.count.mockResolvedValue(1);
  });

  test("returns offers for an authenticated admin user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    const offers = [{ id: 1, description: "Consulting offer", amount: 250, status: "DRAFT" }];
    mockPrisma.offer.findMany.mockResolvedValueOnce(offers);

    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({ data: offers, page: 1, limit: 10, totalItems: 1, totalPages: 1 });
    expect(mockPrisma.offer.count).toHaveBeenCalledWith({ where: {} });
    expect(mockPrisma.offer.findMany).toHaveBeenCalledWith({ where: {}, skip: 0, take: 10, orderBy: { id: "asc" } });
  });

  test("returns offers for an authenticated sales user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    const offers = [{ id: 1, description: "Consulting offer", amount: 250, status: "DRAFT" }];
    mockPrisma.offer.findMany.mockResolvedValueOnce(offers);

    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({ data: offers, page: 1, limit: 10, totalItems: 1, totalPages: 1 });
    expect(mockPrisma.offer.count).toHaveBeenCalledWith({ where: {} });
    expect(mockPrisma.offer.findMany).toHaveBeenCalledWith({ where: {}, skip: 0, take: 10, orderBy: { id: "asc" } });
  });

  test("returns offers for an authenticated support user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SUPPORT" });
    const offers = [{ id: 1, description: "Consulting offer", amount: 250, status: "DRAFT" }];
    mockPrisma.offer.findMany.mockResolvedValueOnce(offers);

    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({ data: offers, page: 1, limit: 10, totalItems: 1, totalPages: 1 });
    expect(mockPrisma.offer.count).toHaveBeenCalledWith({ where: {} });
    expect(mockPrisma.offer.findMany).toHaveBeenCalledWith({ where: {}, skip: 0, take: 10, orderBy: { id: "asc" } });
  });

  test("returns 401 when no authentication token is provided", async () => {

    const response = await request(app)
      .get("/api/offers")
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Authentification required.",
    });
    expect(mockJwt.verify).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.offer.count).not.toHaveBeenCalled();
  });

  test("returns 401 when the token is invalid or expired", async () => {
    mockJwt.verify.mockImplementationOnce(() => {
      throw new Error("jwt expired");
    });

    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer invalid-token")
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Invalid or expired token",
    });
    expect(mockPrisma.offer.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.offer.count).not.toHaveBeenCalled();
  });

  test("returns 500 when the database request fails", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    mockPrisma.offer.findMany.mockRejectedValueOnce(new Error("Database connection failed"));

    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Database connection failed",
    });
  });

  test("uses custom pagination", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const data = [{"id":5},{"id":6}];
    mockPrisma.offer.count.mockResolvedValueOnce(7);
    mockPrisma.offer.findMany.mockResolvedValueOnce(data);
    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .query({"page":"3","limit":"2"})
      .expect("Content-Type", /json/)
      .expect(200);
    expect(mockPrisma.offer.count).toHaveBeenCalledWith({ where: {} });
    expect(mockPrisma.offer.findMany).toHaveBeenCalledWith({
      where: {}, skip: 4, take: 2, orderBy: { id: "asc" },
    });
    expect(response.body).toEqual({
      data, page: 3, limit: 2, totalItems: 7, totalPages: 4,
    });
  });

  test("filters by status", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const data = [{"id":1}];
    mockPrisma.offer.count.mockResolvedValueOnce(1);
    mockPrisma.offer.findMany.mockResolvedValueOnce(data);
    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .query({"status":"ACCEPTED"})
      .expect("Content-Type", /json/)
      .expect(200);
    expect(mockPrisma.offer.count).toHaveBeenCalledWith({ where: {"status":"ACCEPTED"} });
    expect(mockPrisma.offer.findMany).toHaveBeenCalledWith({
      where: {"status":"ACCEPTED"}, skip: 0, take: 10, orderBy: { id: "asc" },
    });
    expect(response.body).toEqual({
      data, page: 1, limit: 10, totalItems: 1, totalPages: 1,
    });
  });

  test("filters by companyId", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const data = [{"id":1}];
    mockPrisma.offer.count.mockResolvedValueOnce(1);
    mockPrisma.offer.findMany.mockResolvedValueOnce(data);
    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .query({"companyId":"2"})
      .expect("Content-Type", /json/)
      .expect(200);
    expect(mockPrisma.offer.count).toHaveBeenCalledWith({ where: {"companyId":2} });
    expect(mockPrisma.offer.findMany).toHaveBeenCalledWith({
      where: {"companyId":2}, skip: 0, take: 10, orderBy: { id: "asc" },
    });
    expect(response.body).toEqual({
      data, page: 1, limit: 10, totalItems: 1, totalPages: 1,
    });
  });

  test("filters by salesUserId", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const data = [{"id":1}];
    mockPrisma.offer.count.mockResolvedValueOnce(1);
    mockPrisma.offer.findMany.mockResolvedValueOnce(data);
    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .query({"salesUserId":"7"})
      .expect("Content-Type", /json/)
      .expect(200);
    expect(mockPrisma.offer.count).toHaveBeenCalledWith({ where: {"salesUserId":7} });
    expect(mockPrisma.offer.findMany).toHaveBeenCalledWith({
      where: {"salesUserId":7}, skip: 0, take: 10, orderBy: { id: "asc" },
    });
    expect(response.body).toEqual({
      data, page: 1, limit: 10, totalItems: 1, totalPages: 1,
    });
  });

  test("combines all filters with pagination", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const data = [{"id":3},{"id":4}];
    mockPrisma.offer.count.mockResolvedValueOnce(4);
    mockPrisma.offer.findMany.mockResolvedValueOnce(data);
    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .query({"status":"ACCEPTED","companyId":"2","salesUserId":"7","page":"2","limit":"2"})
      .expect("Content-Type", /json/)
      .expect(200);
    expect(mockPrisma.offer.count).toHaveBeenCalledWith({ where: {"status":"ACCEPTED","companyId":2,"salesUserId":7} });
    expect(mockPrisma.offer.findMany).toHaveBeenCalledWith({
      where: {"status":"ACCEPTED","companyId":2,"salesUserId":7}, skip: 2, take: 2, orderBy: { id: "asc" },
    });
    expect(response.body).toEqual({
      data, page: 2, limit: 2, totalItems: 4, totalPages: 2,
    });
  });

  test("returns zero totals when no records match", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const data = [];
    mockPrisma.offer.count.mockResolvedValueOnce(0);
    mockPrisma.offer.findMany.mockResolvedValueOnce(data);
    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .query({"status":"ACCEPTED","companyId":"2","salesUserId":"7"})
      .expect("Content-Type", /json/)
      .expect(200);
    expect(mockPrisma.offer.count).toHaveBeenCalledWith({ where: {"status":"ACCEPTED","companyId":2,"salesUserId":7} });
    expect(mockPrisma.offer.findMany).toHaveBeenCalledWith({
      where: {"status":"ACCEPTED","companyId":2,"salesUserId":7}, skip: 0, take: 10, orderBy: { id: "asc" },
    });
    expect(response.body).toEqual({
      data, page: 1, limit: 10, totalItems: 0, totalPages: 0,
    });
  });

  test("returns an empty out-of-range page while preserving totals", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const data = [];
    mockPrisma.offer.count.mockResolvedValueOnce(3);
    mockPrisma.offer.findMany.mockResolvedValueOnce(data);
    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .query({"page":"5","limit":"2"})
      .expect("Content-Type", /json/)
      .expect(200);
    expect(mockPrisma.offer.count).toHaveBeenCalledWith({ where: {} });
    expect(mockPrisma.offer.findMany).toHaveBeenCalledWith({
      where: {}, skip: 8, take: 2, orderBy: { id: "asc" },
    });
    expect(response.body).toEqual({
      data, page: 5, limit: 2, totalItems: 3, totalPages: 2,
    });
  });

  test("returns 400 for page=0", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .query({"page":"0"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.offer.count).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for page=1.5", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .query({"page":"1.5"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.offer.count).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for page=banana", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .query({"page":"banana"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.offer.count).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for limit=0", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .query({"limit":"0"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.offer.count).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for limit=-1", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .query({"limit":"-1"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.offer.count).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for limit=2.5", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .query({"limit":"2.5"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.offer.count).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for limit=banana", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .query({"limit":"banana"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.offer.count).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for status=INVALID", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .query({"status":"INVALID"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "Status must be DRAFT, SENT, ACCEPTED, REJECTED or CANCELLED." });
    expect(mockPrisma.offer.count).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for companyId=0", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .query({"companyId":"0"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.offer.count).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for companyId=banana", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .query({"companyId":"banana"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.offer.count).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for salesUserId=0", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .query({"salesUserId":"0"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.offer.count).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for salesUserId=banana", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .query({"salesUserId":"banana"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.offer.count).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findMany).not.toHaveBeenCalled();
  });

  test("forwards a count query failure", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const error = new Error("Count failed");
    mockPrisma.offer.count.mockRejectedValueOnce(error);
    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .query({})
      .expect("Content-Type", /json/)
      .expect(500);
    expect(response.body).toEqual({ success: false, message: "Count failed" });
    expect(mockPrisma.offer.findMany).not.toHaveBeenCalled();
  });

  test("rejects unknown query parameters", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    const response = await request(app)
      .get("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .query({"unexpected":"value"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.offer.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.offer.count).not.toHaveBeenCalled();
  });
});

describe("GET /api/offers/:id", () => {
  test("returns one offer for an authenticated admin user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    const offer = {
      id: 1, description: "Consulting offer", amount: 250, status: "DRAFT",
      company: { id: 1, name: "Acme" },
      contact: { id: 2, name: "Anna", email: "anna@example.com" },
      salesUser: { id: 3, name: "Sales User", role: "SALES" },
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-02T10:00:00.000Z",
    };
    mockPrisma.offer.findUnique.mockResolvedValueOnce(offer);

    const response = await request(app)
      .get("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(offer);
    expect(mockPrisma.offer.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: {
        id: true,
        description: true,
        amount: true,
        status: true,
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true, email: true } },
        salesUser: { select: { id: true, name: true, role: true } },
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  test("returns one offer for an authenticated sales user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    const offer = {
      id: 1, description: "Consulting offer", amount: 250, status: "DRAFT",
      company: { id: 1, name: "Acme" },
      contact: { id: 2, name: "Anna", email: "anna@example.com" },
      salesUser: { id: 3, name: "Sales User", role: "SALES" },
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-02T10:00:00.000Z",
    };
    mockPrisma.offer.findUnique.mockResolvedValueOnce(offer);

    const response = await request(app)
      .get("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(offer);
    expect(mockPrisma.offer.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: {
        id: true,
        description: true,
        amount: true,
        status: true,
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true, email: true } },
        salesUser: { select: { id: true, name: true, role: true } },
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  test("returns one offer for an authenticated support user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SUPPORT" });
    const offer = {
      id: 1, description: "Consulting offer", amount: 250, status: "DRAFT",
      company: { id: 1, name: "Acme" },
      contact: null,
      salesUser: { id: 3, name: "Sales User", role: "SALES" },
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-02T10:00:00.000Z",
    };
    mockPrisma.offer.findUnique.mockResolvedValueOnce(offer);

    const response = await request(app)
      .get("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(offer);
    expect(mockPrisma.offer.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: {
        id: true,
        description: true,
        amount: true,
        status: true,
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true, email: true } },
        salesUser: { select: { id: true, name: true, role: true } },
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  test("returns 400 when the offer ID is invalid", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });

    const response = await request(app)
      .get("/api/offers/banana")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Offer ID must be a number.",
    });
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
  });

  test("returns 404 when the offer does not exist", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    mockPrisma.offer.findUnique.mockResolvedValueOnce(null);

    const response = await request(app)
      .get("/api/offers/999")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toEqual({
      success: false,
      message: "Offer not found.",
    });
    expect(mockPrisma.offer.findUnique).toHaveBeenCalledWith({
      where: { id: 999 },
      select: {
        id: true,
        description: true,
        amount: true,
        status: true,
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true, email: true } },
        salesUser: { select: { id: true, name: true, role: true } },
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  test("returns 500 when the database request fails", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    mockPrisma.offer.findUnique.mockRejectedValueOnce(new Error("Database connection failed"));

    const response = await request(app)
      .get("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Database connection failed",
    });
  });
});

describe("POST /api/offers", () => {
  test("creates without a contact and assigns the authenticated SALES user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 10, role: "SALES" });
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 10 });
    const offer = { id: 1, contact: null, salesUser: { name: "Current User" } };
    mockPrisma.offer.create.mockResolvedValueOnce(offer);

    const response = await request(app)
      .post("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .send({ description: "Consulting offer", amount: 250, companyId: 1 })
      .expect("Content-Type", /json/)
      .expect(201);

    expect(response.body).toEqual(offer);
    expect(mockPrisma.offer.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { description: "Consulting offer", amount: 250, companyId: 1, contactId: null, salesUserId: 10 } }),
    );
    expect(mockPrisma.contact.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 10 } });
  });

  test("creates without a contact and assigns the authenticated ADMIN user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 10, role: "ADMIN" });
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 10 });
    const offer = { id: 1, contact: null, salesUser: { name: "Current User" } };
    mockPrisma.offer.create.mockResolvedValueOnce(offer);

    const response = await request(app)
      .post("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .send({ description: "Consulting offer", amount: 250, companyId: 1 })
      .expect("Content-Type", /json/)
      .expect(201);

    expect(response.body).toEqual(offer);
    expect(mockPrisma.offer.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { description: "Consulting offer", amount: 250, companyId: 1, contactId: null, salesUserId: 10 } }),
    );
    expect(mockPrisma.contact.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 10 } });
  });

  test("returns 403 when SALES explicitly assigns a sales user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 10, role: "SALES" });

    const response = await request(app)
      .post("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .send({ description: "Consulting offer", amount: 250, companyId: 1, salesUserId: 10 })
      .expect("Content-Type", /json/)
      .expect(403);

    expect(response.body).toEqual({ success: false, message: "Only admins can assign another sales user." });
    expect(mockPrisma.offer.create).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  test("returns 403 when SUPPORT explicitly assigns a sales user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 10, role: "SUPPORT" });

    const response = await request(app)
      .post("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .send({ description: "Consulting offer", amount: 250, companyId: 1, salesUserId: 10 })
      .expect("Content-Type", /json/)
      .expect(403);

    expect(response.body).toEqual({ success: false, message: "Forbidden" });
    expect(mockPrisma.offer.create).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  test("returns 404 when the selected contact is missing", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 10, role: "ADMIN" });
    mockPrisma.contact.findUnique.mockResolvedValueOnce(null);

    const response = await request(app)
      .post("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .send({ description: "Consulting offer", amount: 250, companyId: 1, contactId: 2 })
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toEqual({ success: false, message: "Contact not found." });
    expect(mockPrisma.offer.create).not.toHaveBeenCalled();
  });

  test("returns 400 when the contact belongs to another company", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 10, role: "ADMIN" });
    mockPrisma.contact.findUnique.mockResolvedValueOnce({ id: 2, companyId: 9 });

    const response = await request(app)
      .post("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .send({ description: "Consulting offer", amount: 250, companyId: 1, contactId: 2 })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({ success: false, message: "Contact does not belong to the selected company." });
    expect(mockPrisma.offer.create).not.toHaveBeenCalled();
  });

  test("returns 404 when the assigned user is missing", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 10, role: "ADMIN" });
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);

    const response = await request(app)
      .post("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .send({ description: "Consulting offer", amount: 250, companyId: 1, salesUserId: 99 })
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toEqual({ success: false, message: "Sales user not found." });
    expect(mockPrisma.offer.create).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 2, companyId: 1 });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });
  });

  test("creates an offer for an authenticated admin user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 3 });
    const offer = {
          id: 1,
          description: "Consulting offer",
          amount: 250,
          status: "DRAFT",
          company: { name: "Acme" },
          contact: { name: "Anna" },
          salesUser: { name: "Sales User" },
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        };
    mockPrisma.offer.create.mockResolvedValueOnce(offer);

    const response = await request(app)
      .post("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .send({ description: "Consulting offer", amount: 250, companyId: 1, contactId: 2, salesUserId: 3 })
      .expect("Content-Type", /json/)
      .expect(201);

    expect(response.body).toEqual(offer);
    expect(mockPrisma.offer.create).toHaveBeenCalledWith({
      data: { description: "Consulting offer", amount: 250, companyId: 1, contactId: 2, salesUserId: 3 },
      select: {
        id: true,
        description: true,
        amount: true,
        status: true,
        company: { select: { name: true } },
        contact: { select: { name: true } },
        salesUser: { select: { name: true } },
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
  });

  test("creates an offer for an authenticated sales user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    const offer = {
          id: 1,
          description: "Consulting offer",
          amount: 250,
          status: "DRAFT",
          company: { name: "Acme" },
          contact: { name: "Anna" },
          salesUser: { name: "Sales User" },
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        };
    mockPrisma.offer.create.mockResolvedValueOnce(offer);

    const response = await request(app)
      .post("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .send({ description: "Consulting offer", amount: 250, companyId: 1, contactId: 2 })
      .expect("Content-Type", /json/)
      .expect(201);

    expect(response.body).toEqual(offer);
    expect(mockPrisma.offer.create).toHaveBeenCalledWith({
      data: { description: "Consulting offer", amount: 250, companyId: 1, contactId: 2, salesUserId: 1 },
      select: {
        id: true,
        description: true,
        amount: true,
        status: true,
        company: { select: { name: true } },
        contact: { select: { name: true } },
        salesUser: { select: { name: true } },
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  test("returns 403 when an authenticated support user tries to create an offer", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SUPPORT" });
    const response = await request(app)
      .post("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .send({ description: "Consulting offer", amount: 250, companyId: 1, contactId: 2 })
      .expect("Content-Type", /json/)
      .expect(403);

    expect(response.body).toEqual({ success: false, message: "Forbidden" });
    expect(mockPrisma.offer.create).not.toHaveBeenCalled();
    expect(mockPrisma.contact.findUnique).not.toHaveBeenCalled();
  });

  test("returns 400 when the amount is not positive", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });

    const response = await request(app)
      .post("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .send({ description: "Consulting offer", amount: 0, companyId: 1, contactId: 2, salesUserId: 3 })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Amount must be greater than 0.",
    });
    expect(mockPrisma.offer.create).not.toHaveBeenCalled();
  });

  test("returns 400 when the description is too short", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });

    const response = await request(app)
      .post("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .send({ description: "Hi", amount: 250, companyId: 1, contactId: 2, salesUserId: 3 })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Description must be at least 3 characters.",
    });
    expect(mockPrisma.offer.create).not.toHaveBeenCalled();
  });

  test("returns 401 when no authentication token is provided", async () => {

    const response = await request(app)
      .post("/api/offers")
      .send({ description: "Consulting offer", amount: 250, companyId: 1, contactId: 2 })
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Authentification required.",
    });
    expect(mockJwt.verify).not.toHaveBeenCalled();
    expect(mockPrisma.offer.create).not.toHaveBeenCalled();
  });

  test("returns 400 when a related record does not exist", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    const prismaError = new Error("Database request failed");
    prismaError.code = "P2003";
    mockPrisma.offer.create.mockRejectedValueOnce(prismaError);

    const response = await request(app)
      .post("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .send({ description: "Consulting offer", amount: 250, companyId: 1, contactId: 2 })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Company or sales user does not exist.",
    });
  });

  test("returns 500 when the database request fails", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    mockPrisma.offer.create.mockRejectedValueOnce(new Error("Database connection failed"));

    const response = await request(app)
      .post("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .send({ description: "Consulting offer", amount: 250, companyId: 1, contactId: 2 })
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Database connection failed",
    });
  });

  test("rejects unexpected fields alongside valid data", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    const response = await request(app)
      .post("/api/offers")
      .set("Authorization", "Bearer dummy-token")
      .send({"description":"Consulting work","amount":250,"companyId":1,"unexpected":"value"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.offer.create).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/offers/:id", () => {
  test("returns 403 when SALES tries to reassign an offer", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 10, role: "SALES" });

    const response = await request(app)
      .patch("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ salesUserId: 10 })
      .expect("Content-Type", /json/)
      .expect(403);

    expect(response.body).toEqual({ success: false, message: "Only admins can reassign an offer." });
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
  });

  test("returns 403 when SUPPORT tries to reassign an offer", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 10, role: "SUPPORT" });

    const response = await request(app)
      .patch("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ salesUserId: 10 })
      .expect("Content-Type", /json/)
      .expect(403);

    expect(response.body).toEqual({ success: false, message: "Forbidden" });
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
  });

  test("preserves the assignee when an ADMIN omits salesUserId", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 10, role: "ADMIN" });
    const offer = { id: 1, amount: 500, salesUser: { name: "Existing User" } };
    mockPrisma.offer.update.mockResolvedValueOnce(offer);

    const response = await request(app)
      .patch("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ amount: 500 })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(offer);
    expect(mockPrisma.offer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { description: undefined, amount: 500, companyId: undefined, contactId: undefined, salesUserId: undefined, status: undefined } }),
    );
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  test("returns 404 when the initial offer lookup finds nothing", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 10, role: "ADMIN" });
    mockPrisma.offer.findUnique.mockResolvedValueOnce(null);

    const response = await request(app)
      .patch("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ status: "SENT" })
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toEqual({ success: false, message: "Offer not found." });
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
  });

  test("returns 404 when the reassigned user is missing", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 10, role: "ADMIN" });
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);

    const response = await request(app)
      .patch("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ salesUserId: 99 })
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toEqual({ success: false, message: "Sales user not found." });
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
  });

  test("returns 404 when the new contact is missing", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 10, role: "ADMIN" });
    mockPrisma.contact.findUnique.mockResolvedValueOnce(null);

    const response = await request(app)
      .patch("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ contactId: 7 })
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toEqual({ success: false, message: "Contact not found." });
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
  });

  test("returns 400 when a new contact belongs to another company", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 10, role: "ADMIN" });
    mockPrisma.contact.findUnique.mockResolvedValueOnce({ id: 7, companyId: 9 });

    const response = await request(app)
      .patch("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ contactId: 7 })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({ success: false, message: "Contact does not belong to the selected company." });
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
  });

  test("returns 400 when a company change conflicts with the retained contact", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 10, role: "ADMIN" });
    mockPrisma.offer.findUnique.mockResolvedValueOnce({ id: 1, companyId: 1, contactId: 2, salesUserId: 3 });
    mockPrisma.contact.findUnique.mockResolvedValueOnce({ id: 2, companyId: 1 });

    const response = await request(app)
      .patch("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ companyId: 4 })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({ success: false, message: "Contact does not belong to the selected company." });
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
  });

  test("accepts a new contact belonging to the existing company", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 10, role: "ADMIN" });
    mockPrisma.contact.findUnique.mockResolvedValueOnce({ id: 7, companyId: 1 });
    const offer = { id: 1, contact: { name: "New Contact" } };
    mockPrisma.offer.update.mockResolvedValueOnce(offer);

    const response = await request(app)
      .patch("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ contactId: 7 })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(offer);
    expect(mockPrisma.offer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { description: undefined, amount: undefined, companyId: undefined, contactId: 7, salesUserId: undefined, status: undefined } }),
    );
  });

  test("accepts CANCELLED as an offer status", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 10, role: "SALES" });
    const offer = { id: 1, status: "CANCELLED" };
    mockPrisma.offer.update.mockResolvedValueOnce(offer);

    const response = await request(app)
      .patch("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ status: "CANCELLED" })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(offer);
    expect(mockPrisma.offer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { description: undefined, amount: undefined, companyId: undefined, contactId: undefined, salesUserId: undefined, status: "CANCELLED" } }),
    );
  });
  beforeEach(() => {
    mockPrisma.offer.findUnique.mockResolvedValue({
      id: 1, companyId: 1, contactId: null, salesUserId: 3,
    });
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 5, companyId: 4 });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 6 });
  });

  test("updates an offer for an authenticated admin user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    const offer = {
          id: 1,
          description: "Updated offer",
          amount: 500,
          status: "SENT",
          company: { name: "Acme" },
          contact: { name: "Anna" },
          salesUser: { name: "Sales User" },
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        };
    mockPrisma.offer.update.mockResolvedValueOnce(offer);

    const response = await request(app)
      .patch("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ description: "Updated offer", amount: 500, companyId: 4, contactId: 5, salesUserId: 6, status: "SENT" })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(offer);
    expect(mockPrisma.offer.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { description: "Updated offer", amount: 500, companyId: 4, contactId: 5, salesUserId: 6, status: "SENT" },
      select: {
        id: true,
        description: true,
        amount: true,
        status: true,
        company: { select: { name: true } },
        contact: { select: { name: true } },
        salesUser: { select: { name: true } },
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(mockPrisma.offer.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 6 } });
  });

  test("updates an offer for an authenticated sales user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    const offer = {
          id: 1,
          description: "Consulting offer",
          amount: 250,
          status: "SENT",
          company: { name: "Acme" },
          contact: { name: "Anna" },
          salesUser: { name: "Sales User" },
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        };
    mockPrisma.offer.update.mockResolvedValueOnce(offer);

    const response = await request(app)
      .patch("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ status: "SENT" })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(offer);
    expect(mockPrisma.offer.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { description: undefined, amount: undefined, companyId: undefined, contactId: undefined, salesUserId: undefined, status: "SENT" },
      select: {
        id: true,
        description: true,
        amount: true,
        status: true,
        company: { select: { name: true } },
        contact: { select: { name: true } },
        salesUser: { select: { name: true } },
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  test("returns 403 when an authenticated support user tries to update an offer", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SUPPORT" });
    const response = await request(app)
      .patch("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ status: "SENT" })
      .expect("Content-Type", /json/)
      .expect(403);

    expect(response.body).toEqual({ success: false, message: "Forbidden" });
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
  });

  test("returns 400 when no update fields are provided", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });

    const response = await request(app)
      .patch("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .send({})
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "At least one field is required.",
    });
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
  });

  test("returns 400 when the amount is invalid", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });

    const response = await request(app)
      .patch("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ amount: -1 })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Amount must be greater than 0.",
    });
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
  });

  test("returns 400 when the offer ID is not positive", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });

    const response = await request(app)
      .patch("/api/offers/0")
      .set("Authorization", "Bearer dummy-token")
      .send({ status: "SENT" })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Offer ID must be a positive number.",
    });
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
  });

  test("returns 401 when no authentication token is provided", async () => {

    const response = await request(app)
      .patch("/api/offers/1")
      .send({ status: "SENT" })
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Authentification required.",
    });
    expect(mockJwt.verify).not.toHaveBeenCalled();
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
  });

  test("returns 404 when the offer to update does not exist", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    const prismaError = new Error("Database request failed");
    prismaError.code = "P2025";
    mockPrisma.offer.update.mockRejectedValueOnce(prismaError);

    const response = await request(app)
      .patch("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ status: "SENT" })
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toEqual({
      success: false,
      message: "Offer not found.",
    });
  });

  test("returns 400 when a related record does not exist", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    const prismaError = new Error("Database request failed");
    prismaError.code = "P2003";
    mockPrisma.offer.update.mockRejectedValueOnce(prismaError);

    const response = await request(app)
      .patch("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ companyId: 999 })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Company, contact, or sales user does not exist.",
    });
  });

  test("returns 500 when the database request fails", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    mockPrisma.offer.update.mockRejectedValueOnce(new Error("Database connection failed"));

    const response = await request(app)
      .patch("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ status: "SENT" })
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Database connection failed",
    });
  });

  test("rejects unexpected fields alongside valid data", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    const response = await request(app)
      .patch("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .send({"description":"Updated work","unexpected":"value"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
  });

  test("removes an existing contact when contactId is null", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    mockPrisma.offer.findUnique.mockResolvedValueOnce({ id: 1, companyId: 1, contactId: 2, salesUserId: 3 });
    const record = { id: 1, contact: null };
    mockPrisma.offer.update.mockResolvedValueOnce(record);
    const response = await request(app)
      .patch("/api/offers/1")
      .set("Authorization", "Bearer dummy-token")
      .send({"contactId":null})
      .expect("Content-Type", /json/)
      .expect(200);
    expect(mockPrisma.offer.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 1 },
      data: expect.objectContaining({ contactId: null }),
    }));
    expect(mockPrisma.contact.findUnique).not.toHaveBeenCalled();
    expect(response.body).toEqual(record);

  });
});
