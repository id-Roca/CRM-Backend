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
  invoice: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  offer: { findUnique: jest.fn() },
  company: { findUnique: jest.fn() },
  contact: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
};

jest.unstable_mockModule("../../src/prisma.js", () => ({
  default: mockPrisma,
}));

const mockJwt = { verify: jest.fn() };

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

describe("GET /api/invoices", () => {
  beforeEach(() => {
    mockPrisma.invoice.count.mockResolvedValue(1);
  });

  test("returns invoices for ADMIN", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    const invoices = [{ id: 1, description: "Consulting invoice", amount: 250 }];
    mockPrisma.invoice.findMany.mockResolvedValueOnce(invoices);

    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual({ data: invoices, page: 1, limit: 10, totalItems: 1, totalPages: 1 });
    expect(mockPrisma.invoice.count).toHaveBeenCalledWith({ where: {} });
    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({ where: {}, skip: 0, take: 10, orderBy: { id: "asc" } });
  });

  test("returns invoices for SALES", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SALES" });
    const invoices = [{ id: 1, description: "Consulting invoice", amount: 250 }];
    mockPrisma.invoice.findMany.mockResolvedValueOnce(invoices);

    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual({ data: invoices, page: 1, limit: 10, totalItems: 1, totalPages: 1 });
    expect(mockPrisma.invoice.count).toHaveBeenCalledWith({ where: {} });
    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({ where: {}, skip: 0, take: 10, orderBy: { id: "asc" } });
  });

  test("returns invoices for SUPPORT", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const invoices = [{ id: 1, description: "Consulting invoice", amount: 250 }];
    mockPrisma.invoice.findMany.mockResolvedValueOnce(invoices);

    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual({ data: invoices, page: 1, limit: 10, totalItems: 1, totalPages: 1 });
    expect(mockPrisma.invoice.count).toHaveBeenCalledWith({ where: {} });
    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({ where: {}, skip: 0, take: 10, orderBy: { id: "asc" } });
  });

  test("returns 401 without authentication", async () => {
    const response = await request(app)
      .get("/api/invoices")
      .expect("Content-Type", /json/)
      .expect(401);
    expect(response.body).toEqual({ success: false, message: "Authentification required." });
    expect(mockJwt.verify).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.count).not.toHaveBeenCalled();
  });

  test("returns 401 for an invalid token", async () => {
    mockJwt.verify.mockImplementationOnce(() => { throw new Error("jwt expired"); });
    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(401);
    expect(response.body).toEqual({ success: false, message: "Invalid or expired token" });
    expect(mockPrisma.invoice.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.count).not.toHaveBeenCalled();
  });

  test("returns 500 when the database fails", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    mockPrisma.invoice.findMany.mockRejectedValueOnce(new Error("Database connection failed"));
    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(500);
    expect(response.body).toEqual({ success: false, message: "Database connection failed" });
  });


  test("uses custom pagination", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const data = [{"id":5},{"id":6}];
    mockPrisma.invoice.count.mockResolvedValueOnce(7);
    mockPrisma.invoice.findMany.mockResolvedValueOnce(data);
    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .query({"page":"3","limit":"2"})
      .expect("Content-Type", /json/)
      .expect(200);
    expect(mockPrisma.invoice.count).toHaveBeenCalledWith({ where: {} });
    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
      where: {}, skip: 4, take: 2, orderBy: { id: "asc" },
    });
    expect(response.body).toEqual({
      data, page: 3, limit: 2, totalItems: 7, totalPages: 4,
    });
  });

  test("filters by status", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const data = [{"id":1}];
    mockPrisma.invoice.count.mockResolvedValueOnce(1);
    mockPrisma.invoice.findMany.mockResolvedValueOnce(data);
    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .query({"status":"PAID"})
      .expect("Content-Type", /json/)
      .expect(200);
    expect(mockPrisma.invoice.count).toHaveBeenCalledWith({ where: {"status":"PAID"} });
    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
      where: {"status":"PAID"}, skip: 0, take: 10, orderBy: { id: "asc" },
    });
    expect(response.body).toEqual({
      data, page: 1, limit: 10, totalItems: 1, totalPages: 1,
    });
  });

  test("filters by companyId", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const data = [{"id":1}];
    mockPrisma.invoice.count.mockResolvedValueOnce(1);
    mockPrisma.invoice.findMany.mockResolvedValueOnce(data);
    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .query({"companyId":"2"})
      .expect("Content-Type", /json/)
      .expect(200);
    expect(mockPrisma.invoice.count).toHaveBeenCalledWith({ where: {"companyId":2} });
    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
      where: {"companyId":2}, skip: 0, take: 10, orderBy: { id: "asc" },
    });
    expect(response.body).toEqual({
      data, page: 1, limit: 10, totalItems: 1, totalPages: 1,
    });
  });

  test("combines all filters with pagination", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const data = [{"id":3},{"id":4}];
    mockPrisma.invoice.count.mockResolvedValueOnce(4);
    mockPrisma.invoice.findMany.mockResolvedValueOnce(data);
    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .query({"status":"PAID","companyId":"2","page":"2","limit":"2"})
      .expect("Content-Type", /json/)
      .expect(200);
    expect(mockPrisma.invoice.count).toHaveBeenCalledWith({ where: {"status":"PAID","companyId":2} });
    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
      where: {"status":"PAID","companyId":2}, skip: 2, take: 2, orderBy: { id: "asc" },
    });
    expect(response.body).toEqual({
      data, page: 2, limit: 2, totalItems: 4, totalPages: 2,
    });
  });

  test("returns zero totals when no records match", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const data = [];
    mockPrisma.invoice.count.mockResolvedValueOnce(0);
    mockPrisma.invoice.findMany.mockResolvedValueOnce(data);
    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .query({"status":"PAID","companyId":"2"})
      .expect("Content-Type", /json/)
      .expect(200);
    expect(mockPrisma.invoice.count).toHaveBeenCalledWith({ where: {"status":"PAID","companyId":2} });
    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
      where: {"status":"PAID","companyId":2}, skip: 0, take: 10, orderBy: { id: "asc" },
    });
    expect(response.body).toEqual({
      data, page: 1, limit: 10, totalItems: 0, totalPages: 0,
    });
  });

  test("returns an empty out-of-range page while preserving totals", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const data = [];
    mockPrisma.invoice.count.mockResolvedValueOnce(3);
    mockPrisma.invoice.findMany.mockResolvedValueOnce(data);
    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .query({"page":"5","limit":"2"})
      .expect("Content-Type", /json/)
      .expect(200);
    expect(mockPrisma.invoice.count).toHaveBeenCalledWith({ where: {} });
    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
      where: {}, skip: 8, take: 2, orderBy: { id: "asc" },
    });
    expect(response.body).toEqual({
      data, page: 5, limit: 2, totalItems: 3, totalPages: 2,
    });
  });

  test("returns 400 for page=0", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .query({"page":"0"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.invoice.count).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for page=1.5", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .query({"page":"1.5"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.invoice.count).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for page=banana", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .query({"page":"banana"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.invoice.count).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for limit=0", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .query({"limit":"0"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.invoice.count).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for limit=-1", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .query({"limit":"-1"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.invoice.count).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for limit=2.5", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .query({"limit":"2.5"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.invoice.count).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for limit=banana", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .query({"limit":"banana"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.invoice.count).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for status=INVALID", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .query({"status":"INVALID"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "Status must be DRAFT, ISSUED, PAID or CANCELLED." });
    expect(mockPrisma.invoice.count).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for companyId=0", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .query({"companyId":"0"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.invoice.count).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for companyId=banana", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .query({"companyId":"banana"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.invoice.count).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findMany).not.toHaveBeenCalled();
  });

  test("forwards a count query failure", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const error = new Error("Count failed");
    mockPrisma.invoice.count.mockRejectedValueOnce(error);
    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .query({})
      .expect("Content-Type", /json/)
      .expect(500);
    expect(response.body).toEqual({ success: false, message: "Count failed" });
    expect(mockPrisma.invoice.findMany).not.toHaveBeenCalled();
  });

  test("rejects unknown query parameters", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    const response = await request(app)
      .get("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .query({"unexpected":"value"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.invoice.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.count).not.toHaveBeenCalled();
  });
});

describe("GET /api/invoices/:id", () => {
  test("returns an invoice for SUPPORT", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const invoice = {
      id: 1, description: "Consulting invoice", amount: 250, status: "DRAFT",
      offer: null,
      company: { id: 1, name: "Acme" },
      contact: null,
      salesUser: { id: 3, name: "Sales User", role: "SALES" },
      companyName: "Acme", contactName: null, salesUserName: "Sales User",
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-02T10:00:00.000Z",
    };
    mockPrisma.invoice.findUnique.mockResolvedValueOnce(invoice);
    const response = await request(app)
      .get("/api/invoices/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual(invoice);
    expect(mockPrisma.invoice.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: {
        id: true,
        description: true,
        amount: true,
        status: true,
        offer: { select: { id: true, description: true, status: true } },
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true, email: true } },
        salesUser: { select: { id: true, name: true, role: true } },
        companyName: true,
        contactName: true,
        salesUserName: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  test("returns 400 for ID banana", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SALES" });
    const response = await request(app)
      .get("/api/invoices/banana")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "Invoice ID must be a number." });
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
  });

  test("returns 400 for ID 0", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SALES" });
    const response = await request(app)
      .get("/api/invoices/0")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "Invoice ID must be a positive number." });
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
  });

  test("returns 404 for a missing invoice", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    mockPrisma.invoice.findUnique.mockResolvedValueOnce(null);
    const response = await request(app)
      .get("/api/invoices/999")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Invoice not found." });
  });

});

describe("POST /api/invoices", () => {
  const directData = { description: "Consulting invoice", amount: 250, companyId: 1 };
  const offer = {
    id: 5, status: "ACCEPTED", description: "Accepted consulting", amount: 500,
    companyId: 1, contactId: 2, salesUserId: 3,
    company: { id: 1, name: "Acme Corp" },
    contact: { id: 2, name: "Test Contact", companyId: 1 },
    salesUser: { id: 3, name: "Assigned User" },
  };

  beforeEach(() => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SALES" });
    mockPrisma.company.findUnique.mockResolvedValue({ id: 1, name: "Acme Corp" });
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 2, name: "Test Contact", companyId: 1 });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 10, name: "Logged-in User" });
    mockPrisma.offer.findUnique.mockResolvedValue(offer);
  });

  test("creates an invoice from an accepted Offer using its relationships and snapshots", async () => {
    const data = {
      offerId: 5, companyId: 1, contactId: 2, salesUserId: 3,
      companyName: "Acme Corp", contactName: "Test Contact", salesUserName: "Assigned User",
      description: "Accepted consulting", amount: 500,
    };
    const invoice = { id: 1, ...data, status: "DRAFT" };
    mockPrisma.invoice.create.mockResolvedValueOnce(invoice);
    const response = await request(app)
      .post("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .send({ offerId: 5 })
      .expect("Content-Type", /json/)
      .expect(201);
    expect(response.body).toEqual(invoice);
    expect(mockPrisma.offer.findUnique).toHaveBeenCalledWith({
      where: { id: 5 }, include: { company: true, contact: true, salesUser: true },
    });
    expect(mockPrisma.invoice.create).toHaveBeenCalledWith({
      data: {
        offer: { connect: { id: 5 } }, company: { connect: { id: 1 } },
        contact: { connect: { id: 2 } }, salesUser: { connect: { id: 3 } },
        companyName: "Acme Corp", contactName: "Test Contact", salesUserName: "Assigned User",
        description: "Accepted consulting", amount: 500,
      },
    });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  test("creates multiple invoices from the same accepted Offer without a contact", async () => {
    mockPrisma.offer.findUnique.mockResolvedValue({ ...offer, contactId: null, contact: null });
    const data = {
      offerId: 5, companyId: 1, contactId: null, salesUserId: 3,
      companyName: "Acme Corp", contactName: null, salesUserName: "Assigned User",
      description: "Accepted consulting", amount: 500,
    };
    mockPrisma.invoice.create
      .mockResolvedValueOnce({ id: 1, ...data })
      .mockResolvedValueOnce({ id: 2, ...data });

    for (const id of [1, 2]) {
      const response = await request(app)
        .post("/api/invoices")
        .set("Authorization", "Bearer dummy-token")
        .send({ offerId: 5 })
        .expect("Content-Type", /json/)
        .expect(201);
      expect(response.body).toEqual({ id, ...data });
      expect(mockPrisma.invoice.create).toHaveBeenNthCalledWith(id, {
        data: {
          offer: { connect: { id: 5 } }, company: { connect: { id: 1 } },
          salesUser: { connect: { id: 3 } },
          companyName: "Acme Corp", contactName: null, salesUserName: "Assigned User",
          description: "Accepted consulting", amount: 500,
        },
      });
    }
    expect(mockPrisma.invoice.create).toHaveBeenCalledTimes(2);
  });

  test("creates a direct invoice without contact assigned to the authenticated SALES", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SALES" });
    const data = {
      ...directData, contactId: null, salesUserId: 10,
      companyName: "Acme Corp", contactName: null, salesUserName: "Logged-in User",
    };
    const invoice = { id: 1, ...data };
    mockPrisma.invoice.create.mockResolvedValueOnce(invoice);
    const response = await request(app)
      .post("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .send(directData)
      .expect("Content-Type", /json/)
      .expect(201);
    expect(response.body).toEqual(invoice);
    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(mockPrisma.contact.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.create).toHaveBeenCalledWith({
      data: {
        company: { connect: { id: 1 } }, salesUser: { connect: { id: 10 } },
        companyName: "Acme Corp", contactName: null, salesUserName: "Logged-in User",
        description: "Consulting invoice", amount: 250,
      },
    });
  });

  test("creates a direct invoice without contact assigned to the authenticated ADMIN", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    const data = {
      ...directData, contactId: null, salesUserId: 10,
      companyName: "Acme Corp", contactName: null, salesUserName: "Logged-in User",
    };
    const invoice = { id: 1, ...data };
    mockPrisma.invoice.create.mockResolvedValueOnce(invoice);
    const response = await request(app)
      .post("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .send(directData)
      .expect("Content-Type", /json/)
      .expect(201);
    expect(response.body).toEqual(invoice);
    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(mockPrisma.contact.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.create).toHaveBeenCalledWith({
      data: {
        company: { connect: { id: 1 } }, salesUser: { connect: { id: 10 } },
        companyName: "Acme Corp", contactName: null, salesUserName: "Logged-in User",
        description: "Consulting invoice", amount: 250,
      },
    });
  });

  test("allows ADMIN to assign another user and a matching contact", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 3, name: "Assigned User" });
    const data = {
      ...directData, contactId: 2, salesUserId: 3,
      companyName: "Acme Corp", contactName: "Test Contact", salesUserName: "Assigned User",
    };
    mockPrisma.invoice.create.mockResolvedValueOnce({ id: 1, ...data });
    const response = await request(app)
      .post("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .send({ ...directData, contactId: 2, salesUserId: 3 })
      .expect("Content-Type", /json/)
      .expect(201);
    expect(response.body).toEqual({ id: 1, ...data });
    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(mockPrisma.invoice.create).toHaveBeenCalledWith({
      data: {
        company: { connect: { id: 1 } }, contact: { connect: { id: 2 } },
        salesUser: { connect: { id: 3 } },
        companyName: "Acme Corp", contactName: "Test Contact", salesUserName: "Assigned User",
        description: "Consulting invoice", amount: 250,
      },
    });
  });

  test("rejects a non-accepted Offer", async () => {
    mockPrisma.offer.findUnique.mockResolvedValueOnce({ ...offer, status: "SENT" });
    const response = await request(app)
      .post("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .send({ offerId: 5 })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "An invoice can only be created from an accepted offer." });
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
  });

  test("returns 404 for a missing Offer", async () => {
    mockPrisma.offer.findUnique.mockResolvedValueOnce(null);
    const response = await request(app)
      .post("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .send({ offerId: 5 })
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Offer not found." });
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
  });

  test("rejects a nonpositive amount", async () => {
    
    const response = await request(app)
      .post("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .send({ ...directData, amount: 0 })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "Amount must be greater than 0." });
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
  });

  test("rejects explicit assignment by SALES", async () => {
    
    const response = await request(app)
      .post("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .send({ ...directData, salesUserId: 10 })
      .expect("Content-Type", /json/)
      .expect(403);
    expect(response.body).toEqual({ success: false, message: "Only admins can assign another sales user." });
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
  });

  test("returns 404 for a missing company", async () => {
    mockPrisma.company.findUnique.mockResolvedValueOnce(null);
    const response = await request(app)
      .post("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .send(directData)
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Company not found." });
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
  });

  test("returns 404 for a missing contact", async () => {
    mockPrisma.contact.findUnique.mockResolvedValueOnce(null);
    const response = await request(app)
      .post("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .send({ ...directData, contactId: 2 })
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Contact not found." });
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
  });

  test("returns 404 for a missing assigned user", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    const response = await request(app)
      .post("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .send(directData)
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Sales user not found." });
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
  });

  test("rejects a contact from another company", async () => {
    mockPrisma.contact.findUnique.mockResolvedValueOnce({ id: 2, companyId: 99 });
    const response = await request(app)
      .post("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .send({ ...directData, contactId: 2 })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "Contact does not belong to the selected company." });
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
  });

  test("denies SUPPORT creation", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .post("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .send(directData)
      .expect("Content-Type", /json/)
      .expect(403);
    expect(response.body).toEqual({ success: false, message: "Forbidden" });
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
  });

  test("rejects overrides in the strict Offer creation payload", async () => {
    const response = await request(app)
      .post("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .send({ offerId: 5, amount: 100 })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
  });

  test("requires authentication to create", async () => {
    const response = await request(app)
      .post("/api/invoices")
      .send(directData)
      .expect("Content-Type", /json/)
      .expect(401);
    expect(response.body).toEqual({ success: false, message: "Authentification required." });
    expect(mockPrisma.company.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
  });

  test("returns 500 for an unmapped Prisma creation error", async () => {
    const error = new Error("Foreign key constraint failed");
    error.code = "P2003";
    mockPrisma.invoice.create.mockRejectedValueOnce(error);
    const response = await request(app)
      .post("/api/invoices")
      .set("Authorization", "Bearer dummy-token")
      .send(directData)
      .expect("Content-Type", /json/)
      .expect(500);
    expect(response.body).toEqual({ success: false, message: "Foreign key constraint failed" });
  });

});

describe("PATCH /api/invoices/:id", () => {
  beforeEach(() => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SALES" });
    mockPrisma.invoice.findUnique.mockResolvedValue({
      id: 1, companyId: 1, contactId: null, salesUserId: 10,
    });
  });

  test("allows SALES to update an invoice without a contact", async () => {
    const invoice = { id: 1, companyId: 1, contactId: null, status: "PAID", amount: 300 };
    mockPrisma.invoice.update.mockResolvedValueOnce(invoice);
    const response = await request(app)
      .patch("/api/invoices/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ status: "PAID", amount: 300 })
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual(invoice);
    expect(mockPrisma.invoice.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
      where: { id: 1 }, data: { description: undefined, amount: 300, status: "PAID" },
    });
    expect(mockPrisma.contact.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  test("allows ADMIN to change relationships and snapshots and cancel an invoice", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    mockPrisma.company.findUnique.mockResolvedValueOnce({ id: 4, name: "New Company" });
    mockPrisma.contact.findUnique.mockResolvedValueOnce({ id: 5, companyId: 4, name: "New Contact" });
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 6, name: "New User" });
    const data = {
      description: "Updated invoice", amount: 400, status: "CANCELLED",
      companyId: 4, companyName: "New Company", contactId: 5, contactName: "New Contact",
      salesUserId: 6, salesUserName: "New User",
    };
    mockPrisma.invoice.update.mockResolvedValueOnce({ id: 1, ...data });
    const response = await request(app)
      .patch("/api/invoices/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ description: "Updated invoice", amount: 400, status: "CANCELLED", companyId: 4, contactId: 5, salesUserId: 6 })
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual({ id: 1, ...data });
    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({ where: { id: 4 } });
    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 6 } });
    expect(mockPrisma.invoice.update).toHaveBeenCalledWith({ where: { id: 1 }, data });
  });

  test("denies SUPPORT updates", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const response = await request(app)
      .patch("/api/invoices/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ status: "ISSUED" })
      .expect("Content-Type", /json/)
      .expect(403);
    expect(response.body).toEqual({ success: false, message: "Forbidden" });
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
  });

  test("rejects reassignment by SALES", async () => {
    
    const response = await request(app)
      .patch("/api/invoices/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ salesUserId: 3 })
      .expect("Content-Type", /json/)
      .expect(403);
    expect(response.body).toEqual({ success: false, message: "Only admins can reassign an invoice." });
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
  });

  test("rejects an empty update", async () => {
    
    const response = await request(app)
      .patch("/api/invoices/1")
      .set("Authorization", "Bearer dummy-token")
      .send({})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "At least one field is required." });
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
  });

  test("returns 404 for a missing invoice", async () => {
    mockPrisma.invoice.findUnique.mockResolvedValueOnce(null);
    const response = await request(app)
      .patch("/api/invoices/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ status: "ISSUED" })
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Invoice not found." });
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
  });

  test("returns 404 for a missing company", async () => {
    mockPrisma.company.findUnique.mockResolvedValueOnce(null);
    const response = await request(app)
      .patch("/api/invoices/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ companyId: 4 })
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Company not found." });
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
  });

  test("returns 404 for a missing contact", async () => {
    mockPrisma.contact.findUnique.mockResolvedValueOnce(null);
    const response = await request(app)
      .patch("/api/invoices/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ contactId: 2 })
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Contact not found." });
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
  });

  test("returns 404 for a missing reassigned user", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    const response = await request(app)
      .patch("/api/invoices/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ salesUserId: 3 })
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Sales user not found." });
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
  });

  test("rejects a new contact belonging to a different company", async () => {
    mockPrisma.contact.findUnique.mockResolvedValueOnce({ id: 2, companyId: 99 });
    const response = await request(app)
      .patch("/api/invoices/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ contactId: 2 })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "Contact does not belong to the selected company." });
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
  });

  test("rejects a company change conflicting with the retained contact", async () => {
    mockPrisma.invoice.findUnique.mockResolvedValueOnce({ id: 1, companyId: 1, contactId: 2 });
    mockPrisma.company.findUnique.mockResolvedValueOnce({ id: 4, name: "New Company" });
    mockPrisma.contact.findUnique.mockResolvedValueOnce({ id: 2, companyId: 1 });
    const response = await request(app)
      .patch("/api/invoices/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ companyId: 4 })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "Contact does not belong to the selected company." });
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
  });

  test("rejects an invalid invoice status", async () => {
    const response = await request(app)
      .patch("/api/invoices/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ status: "ACCEPTED" })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
  });

  test("rejects an invalid invoice ID", async () => {
    const response = await request(app)
      .patch("/api/invoices/banana")
      .set("Authorization", "Bearer dummy-token")
      .send({ status: "ISSUED" })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "Invoice ID must be a number." });
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
  });

  test("requires authentication to update", async () => {
    const response = await request(app)
      .patch("/api/invoices/1")
      .send({ status: "ISSUED" })
      .expect("Content-Type", /json/)
      .expect(401);
    expect(response.body).toEqual({ success: false, message: "Authentification required." });
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
  });

  test("maps Prisma P2025 to 404", async () => {
    const error = new Error("Record to update not found");
    error.code = "P2025";
    mockPrisma.invoice.update.mockRejectedValueOnce(error);
    const response = await request(app)
      .patch("/api/invoices/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ status: "ISSUED" })
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Invoice not found." });
  });

  test("returns 500 for an unexpected update failure", async () => {
    mockPrisma.invoice.update.mockRejectedValueOnce(new Error("Database connection failed"));
    const response = await request(app)
      .patch("/api/invoices/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ status: "ISSUED" })
      .expect("Content-Type", /json/)
      .expect(500);
    expect(response.body).toEqual({ success: false, message: "Database connection failed" });
  });


  test("rejects unexpected fields alongside valid data", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    const response = await request(app)
      .patch("/api/invoices/1")
      .set("Authorization", "Bearer dummy-token")
      .send({"description":"Updated work","unexpected":"value"})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
  });

  test("removes an existing contact when contactId is null", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    mockPrisma.invoice.findUnique.mockResolvedValueOnce({ id: 1, companyId: 1, contactId: 2, salesUserId: 3 });
    const record = { id: 1, contact: null, contactName: null };
    mockPrisma.invoice.update.mockResolvedValueOnce(record);
    const response = await request(app)
      .patch("/api/invoices/1")
      .set("Authorization", "Bearer dummy-token")
      .send({"contactId":null})
      .expect("Content-Type", /json/)
      .expect(200);
    expect(mockPrisma.invoice.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 1 },
      data: expect.objectContaining({ contactId: null, contactName: null }),
    }));
    expect(mockPrisma.contact.findUnique).not.toHaveBeenCalled();
    expect(response.body).toEqual(record);

  });
});

describe("DELETE /api/invoices/:id", () => {
  test("returns route not found because invoices have no DELETE endpoint", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    const response = await request(app)
      .delete("/api/invoices/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Route not found" });
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
  });

});
