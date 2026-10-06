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
  ticket: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  company: { findUnique: jest.fn() },
  contact: { findUnique: jest.fn() },
  offer: { findUnique: jest.fn() },
  invoice: { findUnique: jest.fn() },
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

const ticketSelect = {
  id: true, subject: true, description: true, status: true, priority: true,
  company: { select: { name: true } },
  contact: { select: { name: true } },
  offer: { select: { id: true, description: true } },
  invoice: { select: { id: true, description: true } },
  createdBy: { select: { id: true, name: true } },
  assignedUser: { select: { id: true, name: true, role: true } },
  createdAt: true, updatedAt: true,
};

describe("GET /api/tickets", () => {
  test("returns tickets for ADMIN", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    const tickets = [{ id: 1, subject: "Help needed", status: "OPEN" }];
    mockPrisma.ticket.findMany.mockResolvedValueOnce(tickets);
    const response = await request(app)
      .get("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual(tickets);
    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({ orderBy: { id: "asc" } });
  });

  test("returns tickets for SUPPORT", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const tickets = [{ id: 1, subject: "Help needed", status: "OPEN" }];
    mockPrisma.ticket.findMany.mockResolvedValueOnce(tickets);
    const response = await request(app)
      .get("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual(tickets);
    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({ orderBy: { id: "asc" } });
  });

  test("returns tickets for SALES", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SALES" });
    const tickets = [{ id: 1, subject: "Help needed", status: "OPEN" }];
    mockPrisma.ticket.findMany.mockResolvedValueOnce(tickets);
    const response = await request(app)
      .get("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual(tickets);
    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({ orderBy: { id: "asc" } });
  });

  test("requires authentication", async () => {
    const response = await request(app)
      .get("/api/tickets")
      .expect("Content-Type", /json/)
      .expect(401);
    expect(response.body).toEqual({ success: false, message: "Authentification required." });
    expect(mockJwt.verify).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.findMany).not.toHaveBeenCalled();
  });

  test("rejects an invalid token", async () => {
    mockJwt.verify.mockImplementationOnce(() => { throw new Error("jwt expired"); });
    const response = await request(app)
      .get("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(401);
    expect(response.body).toEqual({ success: false, message: "Invalid or expired token" });
    expect(mockPrisma.ticket.findMany).not.toHaveBeenCalled();
  });

  test("returns 500 for a database failure", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    mockPrisma.ticket.findMany.mockRejectedValueOnce(new Error("Database failed"));
    const response = await request(app)
      .get("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(500);
    expect(response.body).toEqual({ success: false, message: "Database failed" });
  });

});

describe("GET /api/tickets/:id", () => {
  test("returns a ticket with related data for ADMIN", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    const ticket = {
      id: 1, subject: "Help needed", description: "Please investigate", status: "OPEN", priority: "HIGH",
      company: { name: "Acme" }, contact: { name: "Anna" }, offer: null, invoice: null,
      createdBy: { id: 10, name: "Support User" }, assignedUser: null,
      createdAt: "2026-10-01T10:00:00.000Z", updatedAt: "2026-10-01T10:00:00.000Z",
    };
    mockPrisma.ticket.findUnique.mockResolvedValueOnce(ticket);
    const response = await request(app)
      .get("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual(ticket);
    expect(mockPrisma.ticket.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, select: ticketSelect });
  });

  test("returns a ticket with related data for SUPPORT", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const ticket = {
      id: 1, subject: "Help needed", description: "Please investigate", status: "OPEN", priority: "HIGH",
      company: { name: "Acme" }, contact: { name: "Anna" }, offer: null, invoice: null,
      createdBy: { id: 10, name: "Support User" }, assignedUser: null,
      createdAt: "2026-10-01T10:00:00.000Z", updatedAt: "2026-10-01T10:00:00.000Z",
    };
    mockPrisma.ticket.findUnique.mockResolvedValueOnce(ticket);
    const response = await request(app)
      .get("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual(ticket);
    expect(mockPrisma.ticket.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, select: ticketSelect });
  });

  test("returns a ticket with related data for SALES", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SALES" });
    const ticket = {
      id: 1, subject: "Help needed", description: "Please investigate", status: "OPEN", priority: "HIGH",
      company: { name: "Acme" }, contact: { name: "Anna" }, offer: null, invoice: null,
      createdBy: { id: 10, name: "Support User" }, assignedUser: null,
      createdAt: "2026-10-01T10:00:00.000Z", updatedAt: "2026-10-01T10:00:00.000Z",
    };
    mockPrisma.ticket.findUnique.mockResolvedValueOnce(ticket);
    const response = await request(app)
      .get("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual(ticket);
    expect(mockPrisma.ticket.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, select: ticketSelect });
  });

  test("rejects ID banana", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SALES" });
    const response = await request(app)
      .get("/api/tickets/banana")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "Ticket ID must be a number." });
    expect(mockPrisma.ticket.findUnique).not.toHaveBeenCalled();
  });

  test("rejects ID 0", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SALES" });
    const response = await request(app)
      .get("/api/tickets/0")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: " Ticket ID must be a positive number." });
    expect(mockPrisma.ticket.findUnique).not.toHaveBeenCalled();
  });

  test("returns 404 for a missing ticket", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    mockPrisma.ticket.findUnique.mockResolvedValueOnce(null);
    const response = await request(app)
      .get("/api/tickets/999")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Ticket not found." });
  });

});

describe("POST /api/tickets", () => {
  const body = { subject: "Help needed", description: "Please investigate", companyId: 1, contactId: 2 };
  beforeEach(() => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    mockPrisma.company.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 2, companyId: 1 });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 20 });
  });

  test("SUPPORT creates with self assignment", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const ticket = { id: 1, subject: body.subject, createdBy: { id: 10, name: "Creator" },
      assignedUser: { id: 10, name: "Assigned User", role: "SUPPORT" } };
    mockPrisma.ticket.create.mockResolvedValueOnce(ticket);
    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send(body)
      .expect("Content-Type", /json/)
      .expect(201);
    expect(response.body).toEqual(ticket);
    expect(mockPrisma.ticket.create).toHaveBeenCalledWith({
      data: {
        subject: body.subject, description: body.description, status: undefined, priority: undefined,
        company: { connect: { id: 1 } }, contact: { connect: { id: 2 } },
        createdBy: { connect: { id: 10 } },
        assignedUser: { connect: { id: 10 } },
      }, select: ticketSelect,
    });
    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
  });

  test("ADMIN creates with no assignee", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    const ticket = { id: 1, subject: body.subject, createdBy: { id: 10, name: "Creator" },
      assignedUser: null };
    mockPrisma.ticket.create.mockResolvedValueOnce(ticket);
    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send(body)
      .expect("Content-Type", /json/)
      .expect(201);
    expect(response.body).toEqual(ticket);
    expect(mockPrisma.ticket.create).toHaveBeenCalledWith({
      data: {
        subject: body.subject, description: body.description, status: undefined, priority: undefined,
        company: { connect: { id: 1 } }, contact: { connect: { id: 2 } },
        createdBy: { connect: { id: 10 } },
      }, select: ticketSelect,
    });
    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
  });

  test("SUPPORT creates with an explicit assignee", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const ticket = { id: 1, subject: body.subject, createdBy: { id: 10, name: "Creator" },
      assignedUser: { id: 20, name: "Assigned User", role: "SUPPORT" } };
    mockPrisma.ticket.create.mockResolvedValueOnce(ticket);
    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send({ ...body, assignedUserId: 20 })
      .expect("Content-Type", /json/)
      .expect(201);
    expect(response.body).toEqual(ticket);
    expect(mockPrisma.ticket.create).toHaveBeenCalledWith({
      data: {
        subject: body.subject, description: body.description, status: undefined, priority: undefined,
        company: { connect: { id: 1 } }, contact: { connect: { id: 2 } },
        createdBy: { connect: { id: 10 } },
        assignedUser: { connect: { id: 20 } },
      }, select: ticketSelect,
    });
    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 20 } });
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
  });

  test("ADMIN creates with an explicit assignee", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    const ticket = { id: 1, subject: body.subject, createdBy: { id: 10, name: "Creator" },
      assignedUser: { id: 20, name: "Assigned User", role: "SUPPORT" } };
    mockPrisma.ticket.create.mockResolvedValueOnce(ticket);
    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send({ ...body, assignedUserId: 20 })
      .expect("Content-Type", /json/)
      .expect(201);
    expect(response.body).toEqual(ticket);
    expect(mockPrisma.ticket.create).toHaveBeenCalledWith({
      data: {
        subject: body.subject, description: body.description, status: undefined, priority: undefined,
        company: { connect: { id: 1 } }, contact: { connect: { id: 2 } },
        createdBy: { connect: { id: 10 } },
        assignedUser: { connect: { id: 20 } },
      }, select: ticketSelect,
    });
    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 20 } });
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
  });

  test("creates with optional links whose contact is 2", async () => {
    mockPrisma.offer.findUnique.mockResolvedValueOnce({ id: 3, companyId: 1, contactId: 2 });
    mockPrisma.invoice.findUnique.mockResolvedValueOnce({ id: 4, companyId: 1, contactId: 2 });
    const ticket = { id: 1, subject: body.subject, status: "OPEN", priority: "HIGH",
      offer: { id: 3, description: "Offer" }, invoice: { id: 4, description: "Invoice" } };
    mockPrisma.ticket.create.mockResolvedValueOnce(ticket);
    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send({ ...body, status: "OPEN", priority: "HIGH", offerId: 3, invoiceId: 4 })
      .expect("Content-Type", /json/)
      .expect(201);
    expect(response.body).toEqual(ticket);
    expect(mockPrisma.ticket.create).toHaveBeenCalledWith({
      data: {
        subject: body.subject, description: body.description, status: "OPEN", priority: "HIGH",
        company: { connect: { id: 1 } }, contact: { connect: { id: 2 } },
        createdBy: { connect: { id: 10 } }, assignedUser: { connect: { id: 10 } },
        offer: { connect: { id: 3 } }, invoice: { connect: { id: 4 } },
      }, select: ticketSelect,
    });
    expect(mockPrisma.offer.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(mockPrisma.invoice.findUnique).toHaveBeenCalledWith({ where: { id: 4 } });
  });

  test("creates with optional links whose contact is null", async () => {
    mockPrisma.offer.findUnique.mockResolvedValueOnce({ id: 3, companyId: 1, contactId: null });
    mockPrisma.invoice.findUnique.mockResolvedValueOnce({ id: 4, companyId: 1, contactId: null });
    const ticket = { id: 1, subject: body.subject, status: "OPEN", priority: "HIGH",
      offer: { id: 3, description: "Offer" }, invoice: { id: 4, description: "Invoice" } };
    mockPrisma.ticket.create.mockResolvedValueOnce(ticket);
    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send({ ...body, status: "OPEN", priority: "HIGH", offerId: 3, invoiceId: 4 })
      .expect("Content-Type", /json/)
      .expect(201);
    expect(response.body).toEqual(ticket);
    expect(mockPrisma.ticket.create).toHaveBeenCalledWith({
      data: {
        subject: body.subject, description: body.description, status: "OPEN", priority: "HIGH",
        company: { connect: { id: 1 } }, contact: { connect: { id: 2 } },
        createdBy: { connect: { id: 10 } }, assignedUser: { connect: { id: 10 } },
        offer: { connect: { id: 3 } }, invoice: { connect: { id: 4 } },
      }, select: ticketSelect,
    });
    expect(mockPrisma.offer.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(mockPrisma.invoice.findUnique).toHaveBeenCalledWith({ where: { id: 4 } });
  });

  test("denies SALES", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SALES" });
    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send(body)
      .expect("Content-Type", /json/)
      .expect(403);
    expect(response.body).toEqual({ success: false, message: "Forbidden" });
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("rejects a short description", async () => {

    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send({ ...body, description: "Hi" })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "Description must be at least 3 characters." });
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("requires company", async () => {

    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send({ subject: body.subject, description: body.description, contactId: 2 })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("requires contact", async () => {

    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send({ subject: body.subject, description: body.description, companyId: 1 })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("rejects a client supplied creator", async () => {

    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send({ ...body, createdById: 99 })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("returns 404 for missing company", async () => {
    mockPrisma.company.findUnique.mockResolvedValueOnce(null);
    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send(body)
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Company not found." });
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("returns 404 for missing contact", async () => {
    mockPrisma.contact.findUnique.mockResolvedValueOnce(null);
    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send(body)
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Contact not found." });
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("rejects a mismatched contact", async () => {
    mockPrisma.contact.findUnique.mockResolvedValueOnce({ id: 2, companyId: 9 });
    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send(body)
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "Contact does not belong to the selected company." });
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("returns 404 for missing assignee", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send({ ...body, assignedUserId: 20 })
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Assigned user not found." });
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("rejects offer with missing", async () => {
    mockPrisma.offer.findUnique.mockResolvedValueOnce(null);
    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send({ ...body, offerId: 3 })
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Offer not found." });
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("rejects offer with wrong company", async () => {
    mockPrisma.offer.findUnique.mockResolvedValueOnce({ companyId: 9, contactId: 2 });
    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send({ ...body, offerId: 3 })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "Offer does not belong to the selected company." });
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("rejects offer with wrong contact", async () => {
    mockPrisma.offer.findUnique.mockResolvedValueOnce({ companyId: 1, contactId: 9 });
    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send({ ...body, offerId: 3 })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "Offer does not belong to the selected contact." });
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("rejects invoice with missing", async () => {
    mockPrisma.invoice.findUnique.mockResolvedValueOnce(null);
    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send({ ...body, invoiceId: 3 })
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Invoice not found." });
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("rejects invoice with wrong company", async () => {
    mockPrisma.invoice.findUnique.mockResolvedValueOnce({ companyId: 9, contactId: 2 });
    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send({ ...body, invoiceId: 3 })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "Invoice does not belong to the selected company." });
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("rejects invoice with wrong contact", async () => {
    mockPrisma.invoice.findUnique.mockResolvedValueOnce({ companyId: 1, contactId: 9 });
    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send({ ...body, invoiceId: 3 })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "Invoice does not belong to the selected contact." });
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("requires authentication", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .send(body)
      .expect("Content-Type", /json/)
      .expect(401);
    expect(response.body).toEqual({ success: false, message: "Authentification required." });
    expect(mockPrisma.company.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("returns 500 for an unmapped Prisma creation error", async () => {
    const error = new Error("Foreign key constraint failed");
    error.code = "P2003";
    mockPrisma.ticket.create.mockRejectedValueOnce(error);
    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer dummy-token")
      .send(body)
      .expect("Content-Type", /json/)
      .expect(500);
    expect(response.body).toEqual({ success: false, message: "Foreign key constraint failed" });
  });

});

describe("PATCH /api/tickets/:id", () => {
  beforeEach(() => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SALES" });
    mockPrisma.ticket.findUnique.mockResolvedValue({ id: 1, companyId: 1, contactId: 2 });
  });

  test("allows ADMIN to update ticket fields", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    const body = { subject: "Updated subject", description: "Updated description", status: "RESOLVED", priority: "URGENT" };
    const ticket = { id: 1, ...body };
    mockPrisma.ticket.update.mockResolvedValueOnce(ticket);
    const response = await request(app)
      .patch("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .send(body)
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual(ticket);
    expect(mockPrisma.ticket.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockPrisma.ticket.update).toHaveBeenCalledWith({ where: { id: 1 }, data: body, select: ticketSelect });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
  });

  test("allows SUPPORT to update ticket fields", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SUPPORT" });
    const body = { subject: "Updated subject", description: "Updated description", status: "RESOLVED", priority: "URGENT" };
    const ticket = { id: 1, ...body };
    mockPrisma.ticket.update.mockResolvedValueOnce(ticket);
    const response = await request(app)
      .patch("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .send(body)
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual(ticket);
    expect(mockPrisma.ticket.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockPrisma.ticket.update).toHaveBeenCalledWith({ where: { id: 1 }, data: body, select: ticketSelect });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
  });

  test("allows SALES to update ticket fields", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "SALES" });
    const body = { subject: "Updated subject", description: "Updated description", status: "RESOLVED", priority: "URGENT" };
    const ticket = { id: 1, ...body };
    mockPrisma.ticket.update.mockResolvedValueOnce(ticket);
    const response = await request(app)
      .patch("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .send(body)
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual(ticket);
    expect(mockPrisma.ticket.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockPrisma.ticket.update).toHaveBeenCalledWith({ where: { id: 1 }, data: body, select: ticketSelect });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
  });

  test("allows SALES to reassign and connect consistent optional links", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 20 });
    mockPrisma.offer.findUnique.mockResolvedValueOnce({ id: 3, companyId: 1, contactId: 2 });
    mockPrisma.invoice.findUnique.mockResolvedValueOnce({ id: 4, companyId: 1, contactId: null });
    const ticket = { id: 1, assignedUser: { id: 20, name: "Assigned User", role: "SUPPORT" },
      offer: { id: 3, description: "Offer" }, invoice: { id: 4, description: "Invoice" } };
    mockPrisma.ticket.update.mockResolvedValueOnce(ticket);
    const response = await request(app)
      .patch("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ offerId: 3, invoiceId: 4, assignedUserId: 20 })
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual(ticket);
    expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
      where: { id: 1 }, data: {
        subject: undefined, description: undefined, status: undefined, priority: undefined,
        offer: { connect: { id: 3 } }, invoice: { connect: { id: 4 } }, assignedUser: { connect: { id: 20 } },
      }, select: ticketSelect,
    });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 20 } });
    expect(mockPrisma.offer.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(mockPrisma.invoice.findUnique).toHaveBeenCalledWith({ where: { id: 4 } });
  });

  test("disconnects optional links and assignee with null", async () => {
    const ticket = { id: 1, offer: null, invoice: null, assignedUser: null };
    mockPrisma.ticket.update.mockResolvedValueOnce(ticket);
    const response = await request(app)
      .patch("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ offerId: null, invoiceId: null, assignedUserId: null })
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual(ticket);
    expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
      where: { id: 1 }, data: {
        subject: undefined, description: undefined, status: undefined, priority: undefined,
        offer: { disconnect: true }, invoice: { disconnect: true }, assignedUser: { disconnect: true },
      }, select: ticketSelect,
    });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
  });

  test("rejects empty update", async () => {

    const response = await request(app)
      .patch("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .send({})
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "At least one field is required." });
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects immutable company", async () => {

    const response = await request(app)
      .patch("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ companyId: 9, subject: 'Updated subject' })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects immutable contact", async () => {

    const response = await request(app)
      .patch("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ contactId: 9, subject: 'Updated subject' })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects invalid status", async () => {

    const response = await request(app)
      .patch("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ status: 'INVALID' })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects invalid priority", async () => {

    const response = await request(app)
      .patch("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ priority: 'INVALID' })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: expect.any(String) });
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects missing ticket", async () => {
    mockPrisma.ticket.findUnique.mockResolvedValueOnce(null);
    const response = await request(app)
      .patch("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ status: 'CLOSED' })
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Ticket not found." });
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects missing assignee", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    const response = await request(app)
      .patch("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ assignedUserId: 20 })
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Assigned user not found." });
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects offer with missing", async () => {
    mockPrisma.offer.findUnique.mockResolvedValueOnce(null);
    const response = await request(app)
      .patch("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ offerId: 3 })
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Offer not found." });
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects offer with wrong company", async () => {
    mockPrisma.offer.findUnique.mockResolvedValueOnce({ companyId: 9, contactId: 2 });
    const response = await request(app)
      .patch("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ offerId: 3 })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "Offer does not belong to the ticket company." });
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects offer with wrong contact", async () => {
    mockPrisma.offer.findUnique.mockResolvedValueOnce({ companyId: 1, contactId: 9 });
    const response = await request(app)
      .patch("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ offerId: 3 })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "Offer does not belong to the ticket contact." });
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects invoice with missing", async () => {
    mockPrisma.invoice.findUnique.mockResolvedValueOnce(null);
    const response = await request(app)
      .patch("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ invoiceId: 3 })
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Invoice not found." });
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects invoice with wrong company", async () => {
    mockPrisma.invoice.findUnique.mockResolvedValueOnce({ companyId: 9, contactId: 2 });
    const response = await request(app)
      .patch("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ invoiceId: 3 })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "Invoice does not belong to the ticket company." });
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects invoice with wrong contact", async () => {
    mockPrisma.invoice.findUnique.mockResolvedValueOnce({ companyId: 1, contactId: 9 });
    const response = await request(app)
      .patch("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ invoiceId: 3 })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "Invoice does not belong to the ticket contact." });
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects an invalid ticket ID", async () => {
    const response = await request(app)
      .patch("/api/tickets/banana")
      .set("Authorization", "Bearer dummy-token")
      .send({ status: "CLOSED" })
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toEqual({ success: false, message: "Ticket ID must be a number." });
    expect(mockPrisma.ticket.findUnique).not.toHaveBeenCalled();
  });

  test("requires authentication", async () => {
    const response = await request(app)
      .patch("/api/tickets/1")
      .send({ status: "CLOSED" })
      .expect("Content-Type", /json/)
      .expect(401);
    expect(response.body).toEqual({ success: false, message: "Authentification required." });
    expect(mockPrisma.ticket.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("maps Prisma P2025 to 404", async () => {
    const error = new Error("Database failed");
    error.code = "P2025";
    mockPrisma.ticket.update.mockRejectedValueOnce(error);
    const response = await request(app)
      .patch("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ status: "CLOSED" })
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Ticket not found." });
  });

  test("returns 500 for unexpected update errors", async () => {
    const error = new Error("Database failed");
    mockPrisma.ticket.update.mockRejectedValueOnce(error);
    const response = await request(app)
      .patch("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ status: "CLOSED" })
      .expect("Content-Type", /json/)
      .expect(500);
    expect(response.body).toEqual({ success: false, message: "Database failed" });
  });

});

describe("DELETE /api/tickets/:id", () => {
  test("returns 404 because there is no DELETE route", async () => {
    mockJwt.verify.mockReturnValue({ userId: 10, role: "ADMIN" });
    const response = await request(app)
      .delete("/api/tickets/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toEqual({ success: false, message: "Route not found" });
    expect(mockPrisma.ticket.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

});

