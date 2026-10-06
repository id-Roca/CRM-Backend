import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";

const mockPrisma = {
  ticket: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  company: { findUnique: jest.fn() },
  contact: { findUnique: jest.fn() },
  offer: { findUnique: jest.fn() },
  invoice: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
};

jest.unstable_mockModule("../../../src/prisma.js", () => ({ default: mockPrisma }));

let getAllTickets, getTicketById, createNewTicket, updateTicket;
beforeAll(async () => {
  ({ getAllTickets, getTicketById, createNewTicket, updateTicket } =
    await import("../../../src/controllers/ticketControllers.js"));
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

let res, next;
beforeEach(() => {
  jest.resetAllMocks();
  res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  next = jest.fn();
});

describe("getAllTickets", () => {
  beforeEach(() => {
    mockPrisma.ticket.count.mockResolvedValue(1);
  });

  test("returns tickets ordered by ID", async () => {
    const tickets = [{ id: 1, subject: "Help needed" }];
    mockPrisma.ticket.findMany.mockResolvedValueOnce(tickets);
    await getAllTickets({ query: {} }, res, next);
    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({ where: {}, skip: 0, take: 10, orderBy: { id: "asc" } });
    expect(res.json).toHaveBeenCalledWith({ data: tickets, page: 1, limit: 10, totalItems: 1, totalPages: 1 });
    expect(mockPrisma.ticket.count).toHaveBeenCalledWith({ where: {} });
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards database errors", async () => {
    const error = new Error("Database failed");
    mockPrisma.ticket.findMany.mockRejectedValueOnce(error);
    await getAllTickets({ query: {} }, res, next);
    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });


  test("uses custom pagination", async () => {
    const res = { json: jest.fn() };
    const next = jest.fn();
    const data = [{"id":5},{"id":6}];
    mockPrisma.ticket.count.mockResolvedValueOnce(7);
    mockPrisma.ticket.findMany.mockResolvedValueOnce(data);
    await getAllTickets({ query: {"page":"3","limit":"2"} }, res, next);
    expect(mockPrisma.ticket.count).toHaveBeenCalledWith({ where: {} });
    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
      where: {}, skip: 4, take: 2, orderBy: { id: "asc" },
    });
    expect(res.json).toHaveBeenCalledWith({
      data, page: 3, limit: 2, totalItems: 7, totalPages: 4,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("filters by status", async () => {
    const res = { json: jest.fn() };
    const next = jest.fn();
    const data = [{"id":1}];
    mockPrisma.ticket.count.mockResolvedValueOnce(1);
    mockPrisma.ticket.findMany.mockResolvedValueOnce(data);
    await getAllTickets({ query: {"status":"OPEN"} }, res, next);
    expect(mockPrisma.ticket.count).toHaveBeenCalledWith({ where: {"status":"OPEN"} });
    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
      where: {"status":"OPEN"}, skip: 0, take: 10, orderBy: { id: "asc" },
    });
    expect(res.json).toHaveBeenCalledWith({
      data, page: 1, limit: 10, totalItems: 1, totalPages: 1,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("filters by priority", async () => {
    const res = { json: jest.fn() };
    const next = jest.fn();
    const data = [{"id":1}];
    mockPrisma.ticket.count.mockResolvedValueOnce(1);
    mockPrisma.ticket.findMany.mockResolvedValueOnce(data);
    await getAllTickets({ query: {"priority":"HIGH"} }, res, next);
    expect(mockPrisma.ticket.count).toHaveBeenCalledWith({ where: {"priority":"HIGH"} });
    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
      where: {"priority":"HIGH"}, skip: 0, take: 10, orderBy: { id: "asc" },
    });
    expect(res.json).toHaveBeenCalledWith({
      data, page: 1, limit: 10, totalItems: 1, totalPages: 1,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("filters by assignedUserId", async () => {
    const res = { json: jest.fn() };
    const next = jest.fn();
    const data = [{"id":1}];
    mockPrisma.ticket.count.mockResolvedValueOnce(1);
    mockPrisma.ticket.findMany.mockResolvedValueOnce(data);
    await getAllTickets({ query: {"assignedUserId":"7"} }, res, next);
    expect(mockPrisma.ticket.count).toHaveBeenCalledWith({ where: {"assignedUserId":7} });
    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
      where: {"assignedUserId":7}, skip: 0, take: 10, orderBy: { id: "asc" },
    });
    expect(res.json).toHaveBeenCalledWith({
      data, page: 1, limit: 10, totalItems: 1, totalPages: 1,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("combines all filters with pagination", async () => {
    const res = { json: jest.fn() };
    const next = jest.fn();
    const data = [{"id":3},{"id":4}];
    mockPrisma.ticket.count.mockResolvedValueOnce(4);
    mockPrisma.ticket.findMany.mockResolvedValueOnce(data);
    await getAllTickets({ query: {"status":"OPEN","priority":"HIGH","assignedUserId":"7","page":"2","limit":"2"} }, res, next);
    expect(mockPrisma.ticket.count).toHaveBeenCalledWith({ where: {"status":"OPEN","priority":"HIGH","assignedUserId":7} });
    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
      where: {"status":"OPEN","priority":"HIGH","assignedUserId":7}, skip: 2, take: 2, orderBy: { id: "asc" },
    });
    expect(res.json).toHaveBeenCalledWith({
      data, page: 2, limit: 2, totalItems: 4, totalPages: 2,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("returns zero totals when no records match", async () => {
    const res = { json: jest.fn() };
    const next = jest.fn();
    const data = [];
    mockPrisma.ticket.count.mockResolvedValueOnce(0);
    mockPrisma.ticket.findMany.mockResolvedValueOnce(data);
    await getAllTickets({ query: {"status":"OPEN","priority":"HIGH","assignedUserId":"7"} }, res, next);
    expect(mockPrisma.ticket.count).toHaveBeenCalledWith({ where: {"status":"OPEN","priority":"HIGH","assignedUserId":7} });
    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
      where: {"status":"OPEN","priority":"HIGH","assignedUserId":7}, skip: 0, take: 10, orderBy: { id: "asc" },
    });
    expect(res.json).toHaveBeenCalledWith({
      data, page: 1, limit: 10, totalItems: 0, totalPages: 0,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("returns an empty out-of-range page while preserving totals", async () => {
    const res = { json: jest.fn() };
    const next = jest.fn();
    const data = [];
    mockPrisma.ticket.count.mockResolvedValueOnce(3);
    mockPrisma.ticket.findMany.mockResolvedValueOnce(data);
    await getAllTickets({ query: {"page":"5","limit":"2"} }, res, next);
    expect(mockPrisma.ticket.count).toHaveBeenCalledWith({ where: {} });
    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
      where: {}, skip: 8, take: 2, orderBy: { id: "asc" },
    });
    expect(res.json).toHaveBeenCalledWith({
      data, page: 5, limit: 2, totalItems: 3, totalPages: 2,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("returns 400 for page=0", async () => {
    const res = { json: jest.fn() };
    const next = jest.fn();
    await getAllTickets({ query: {"page":"0"} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: expect.any(String) }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.count).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for page=1.5", async () => {
    const res = { json: jest.fn() };
    const next = jest.fn();
    await getAllTickets({ query: {"page":"1.5"} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: expect.any(String) }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.count).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for page=banana", async () => {
    const res = { json: jest.fn() };
    const next = jest.fn();
    await getAllTickets({ query: {"page":"banana"} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: expect.any(String) }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.count).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for limit=0", async () => {
    const res = { json: jest.fn() };
    const next = jest.fn();
    await getAllTickets({ query: {"limit":"0"} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: expect.any(String) }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.count).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for limit=-1", async () => {
    const res = { json: jest.fn() };
    const next = jest.fn();
    await getAllTickets({ query: {"limit":"-1"} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: expect.any(String) }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.count).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for limit=2.5", async () => {
    const res = { json: jest.fn() };
    const next = jest.fn();
    await getAllTickets({ query: {"limit":"2.5"} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: expect.any(String) }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.count).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for limit=banana", async () => {
    const res = { json: jest.fn() };
    const next = jest.fn();
    await getAllTickets({ query: {"limit":"banana"} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: expect.any(String) }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.count).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for status=INVALID", async () => {
    const res = { json: jest.fn() };
    const next = jest.fn();
    await getAllTickets({ query: {"status":"INVALID"} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: "Status must be OPEN, IN_PROGRESS, WAITING, RESOLVED, or CLOSED." }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.count).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for assignedUserId=0", async () => {
    const res = { json: jest.fn() };
    const next = jest.fn();
    await getAllTickets({ query: {"assignedUserId":"0"} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: expect.any(String) }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.count).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for assignedUserId=banana", async () => {
    const res = { json: jest.fn() };
    const next = jest.fn();
    await getAllTickets({ query: {"assignedUserId":"banana"} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: expect.any(String) }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.count).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.findMany).not.toHaveBeenCalled();
  });

  test("returns 400 for priority=INVALID", async () => {
    const res = { json: jest.fn() };
    const next = jest.fn();
    await getAllTickets({ query: {"priority":"INVALID"} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: "Priority must be LOW, MEDIUM, HIGH, OR URGENT." }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.count).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.findMany).not.toHaveBeenCalled();
  });

  test("forwards a count query failure", async () => {
    const res = { json: jest.fn() };
    const next = jest.fn();
    const error = new Error("Count failed");
    mockPrisma.ticket.count.mockRejectedValueOnce(error);
    await getAllTickets({ query: {} }, res, next);
    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.findMany).not.toHaveBeenCalled();
  });
});

describe("getTicketById", () => {
  test("returns the selected ticket and its related data using a numeric ID", async () => {
    const ticket = {
      id: 1, subject: "Help needed", description: "Please investigate", status: "OPEN", priority: "MEDIUM",
      company: { name: "Acme" }, contact: { name: "Anna" }, offer: null, invoice: null,
      createdBy: { id: 10, name: "Support" }, assignedUser: { id: 10, name: "Support", role: "SUPPORT" },
      createdAt: new Date("2026-10-01"), updatedAt: new Date("2026-10-01"),
    };
    mockPrisma.ticket.findUnique.mockResolvedValueOnce(ticket);
    await getTicketById({ params: { id: "1" } }, res, next);
    expect(mockPrisma.ticket.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, select: ticketSelect });
    expect(res.json).toHaveBeenCalledWith(ticket);
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects ID banana", async () => {
    await getTicketById({ params: { id: "banana" } }, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: "Ticket ID must be a number.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.findUnique).not.toHaveBeenCalled();
  });

  test("rejects ID 0", async () => {
    await getTicketById({ params: { id: "0" } }, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: "Ticket ID must be a positive number.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.findUnique).not.toHaveBeenCalled();
  });

  test("returns 404 when the ticket does not exist", async () => {
    mockPrisma.ticket.findUnique.mockResolvedValueOnce(null);
    await getTicketById({ params: { id: "1" } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404, message: "Ticket not found." }));
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards lookup errors", async () => {
    const error = new Error("Database failed");
    mockPrisma.ticket.findUnique.mockRejectedValueOnce(error);
    await getTicketById({ params: { id: "1" } }, res, next);
    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });

});

describe("createNewTicket", () => {
  let req;
  beforeEach(() => {
    req = { user: { userId: 10, role: "SUPPORT" }, body: {
      subject: "Help needed", description: "Please investigate", companyId: 1, contactId: 2,
    } };
    mockPrisma.company.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 2, companyId: 1 });
    mockPrisma.offer.findUnique.mockResolvedValue({ id: 3, companyId: 1, contactId: 2 });
    mockPrisma.invoice.findUnique.mockResolvedValue({ id: 4, companyId: 1, contactId: 2 });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 20 });
  });

  test("SUPPORT creates with self assignment", async () => {
    req.user.role = "SUPPORT";
    const ticket = { id: 1, subject: req.body.subject };
    mockPrisma.ticket.create.mockResolvedValueOnce(ticket);
    await createNewTicket(req, res, next);
    expect(mockPrisma.ticket.create).toHaveBeenCalledWith({
      data: {
        subject: "Help needed", description: "Please investigate", status: undefined, priority: undefined,
        company: { connect: { id: 1 } }, contact: { connect: { id: 2 } },
        createdBy: { connect: { id: 10 } },
        assignedUser: { connect: { id: 10 } },
      },
      select: ticketSelect,
    });
    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(ticket);
    expect(next).not.toHaveBeenCalled();
  });

  test("ADMIN creates with no assignee", async () => {
    req.user.role = "ADMIN";
    const ticket = { id: 1, subject: req.body.subject };
    mockPrisma.ticket.create.mockResolvedValueOnce(ticket);
    await createNewTicket(req, res, next);
    expect(mockPrisma.ticket.create).toHaveBeenCalledWith({
      data: {
        subject: "Help needed", description: "Please investigate", status: undefined, priority: undefined,
        company: { connect: { id: 1 } }, contact: { connect: { id: 2 } },
        createdBy: { connect: { id: 10 } },
      },
      select: ticketSelect,
    });
    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(ticket);
    expect(next).not.toHaveBeenCalled();
  });

  test("SUPPORT creates with an explicit assignee", async () => {
    req.user.role = "SUPPORT";
    req.body.assignedUserId = 20;
    const ticket = { id: 1, subject: req.body.subject };
    mockPrisma.ticket.create.mockResolvedValueOnce(ticket);
    await createNewTicket(req, res, next);
    expect(mockPrisma.ticket.create).toHaveBeenCalledWith({
      data: {
        subject: "Help needed", description: "Please investigate", status: undefined, priority: undefined,
        company: { connect: { id: 1 } }, contact: { connect: { id: 2 } },
        createdBy: { connect: { id: 10 } },
        assignedUser: { connect: { id: 20 } },
      },
      select: ticketSelect,
    });
    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 20 } });
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(ticket);
    expect(next).not.toHaveBeenCalled();
  });

  test("ADMIN creates with an explicit assignee", async () => {
    req.user.role = "ADMIN";
    req.body.assignedUserId = 20;
    const ticket = { id: 1, subject: req.body.subject };
    mockPrisma.ticket.create.mockResolvedValueOnce(ticket);
    await createNewTicket(req, res, next);
    expect(mockPrisma.ticket.create).toHaveBeenCalledWith({
      data: {
        subject: "Help needed", description: "Please investigate", status: undefined, priority: undefined,
        company: { connect: { id: 1 } }, contact: { connect: { id: 2 } },
        createdBy: { connect: { id: 10 } },
        assignedUser: { connect: { id: 20 } },
      },
      select: ticketSelect,
    });
    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 20 } });
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(ticket);
    expect(next).not.toHaveBeenCalled();
  });

  test("accepts explicit valid creation status and priority", async () => {
    req.body.status = "OPEN";
    req.body.priority = "HIGH";
    mockPrisma.ticket.create.mockResolvedValueOnce({ id: 1 });
    await createNewTicket(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.create).toHaveBeenCalledWith({
      data: {
        subject: "Help needed", description: "Please investigate", status: "OPEN", priority: "HIGH",
        company: { connect: { id: 1 } }, contact: { connect: { id: 2 } },
        createdBy: { connect: { id: 10 } }, assignedUser: { connect: { id: 10 } },
      }, select: ticketSelect,
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("connects optional offer and invoice with contact 2", async () => {
    Object.assign(req.body, { offerId: 3, invoiceId: 4 });
    mockPrisma.offer.findUnique.mockResolvedValueOnce({ id: 3, companyId: 1, contactId: 2 });
    mockPrisma.invoice.findUnique.mockResolvedValueOnce({ id: 4, companyId: 1, contactId: 2 });
    mockPrisma.ticket.create.mockResolvedValueOnce({ id: 1 });
    await createNewTicket(req, res, next);
    expect(mockPrisma.ticket.create).toHaveBeenCalledWith({
      data: {
        subject: "Help needed", description: "Please investigate", status: undefined, priority: undefined,
        company: { connect: { id: 1 } }, contact: { connect: { id: 2 } },
        createdBy: { connect: { id: 10 } }, assignedUser: { connect: { id: 10 } },
        offer: { connect: { id: 3 } }, invoice: { connect: { id: 4 } },
      }, select: ticketSelect,
    });
    expect(mockPrisma.offer.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(mockPrisma.invoice.findUnique).toHaveBeenCalledWith({ where: { id: 4 } });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("connects optional offer and invoice with contact null", async () => {
    Object.assign(req.body, { offerId: 3, invoiceId: 4 });
    mockPrisma.offer.findUnique.mockResolvedValueOnce({ id: 3, companyId: 1, contactId: null });
    mockPrisma.invoice.findUnique.mockResolvedValueOnce({ id: 4, companyId: 1, contactId: null });
    mockPrisma.ticket.create.mockResolvedValueOnce({ id: 1 });
    await createNewTicket(req, res, next);
    expect(mockPrisma.ticket.create).toHaveBeenCalledWith({
      data: {
        subject: "Help needed", description: "Please investigate", status: undefined, priority: undefined,
        company: { connect: { id: 1 } }, contact: { connect: { id: 2 } },
        createdBy: { connect: { id: 10 } }, assignedUser: { connect: { id: 10 } },
        offer: { connect: { id: 3 } }, invoice: { connect: { id: 4 } },
      }, select: ticketSelect,
    });
    expect(mockPrisma.offer.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(mockPrisma.invoice.findUnique).toHaveBeenCalledWith({ where: { id: 4 } });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("denies SALES", async () => {
    req.user.role = "SALES";
    await createNewTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403, message: "Only admin and support users can create tickets.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("requires company", async () => {
    delete req.body.companyId;
    await createNewTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: expect.any(String),
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("requires contact", async () => {
    delete req.body.contactId;
    await createNewTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: expect.any(String),
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("rejects a short subject", async () => {
    req.body.subject = "Hi";
    await createNewTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: "Subject must be at least 3 characters.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("rejects client supplied creator", async () => {
    req.body.createdById = 99;
    await createNewTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: expect.any(String),
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("rejects missing company", async () => {
    mockPrisma.company.findUnique.mockResolvedValueOnce(null);
    await createNewTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 404, message: "Company not found.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("rejects missing contact", async () => {
    mockPrisma.contact.findUnique.mockResolvedValueOnce(null);
    await createNewTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 404, message: "Contact not found.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("rejects contact from another company", async () => {
    mockPrisma.contact.findUnique.mockResolvedValueOnce({ id: 2, companyId: 9 });
    await createNewTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: "Contact does not belong to the selected company.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("rejects missing assignee", async () => {
    req.body.assignedUserId = 20; mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    await createNewTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 404, message: "Assigned user not found.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("rejects offer missing", async () => {
    req.body.offerId = 3; mockPrisma.offer.findUnique.mockResolvedValueOnce(null);
    await createNewTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 404, message: "Offer not found.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("rejects offer wrong company", async () => {
    req.body.offerId = 3; mockPrisma.offer.findUnique.mockResolvedValueOnce({ companyId: 9, contactId: 2 });
    await createNewTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: "Offer does not belong to the selected company.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("rejects offer wrong contact", async () => {
    req.body.offerId = 3; mockPrisma.offer.findUnique.mockResolvedValueOnce({ companyId: 1, contactId: 9 });
    await createNewTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: "Offer does not belong to the selected contact.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("rejects invoice missing", async () => {
    req.body.invoiceId = 3; mockPrisma.invoice.findUnique.mockResolvedValueOnce(null);
    await createNewTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 404, message: "Invoice not found.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("rejects invoice wrong company", async () => {
    req.body.invoiceId = 3; mockPrisma.invoice.findUnique.mockResolvedValueOnce({ companyId: 9, contactId: 2 });
    await createNewTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: "Invoice does not belong to the selected company.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("rejects invoice wrong contact", async () => {
    req.body.invoiceId = 3; mockPrisma.invoice.findUnique.mockResolvedValueOnce({ companyId: 1, contactId: 9 });
    await createNewTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: "Invoice does not belong to the selected contact.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test("forwards unmapped Prisma creation errors unchanged", async () => {
    const error = new Error("Foreign key constraint failed");
    error.code = "P2003";
    mockPrisma.ticket.create.mockRejectedValueOnce(error);
    await createNewTicket(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
    expect(error.statusCode).toBeUndefined();
    expect(res.json).not.toHaveBeenCalled();
  });

});

describe("updateTicket", () => {
  let req;
  beforeEach(() => {
    req = { params: { id: "1" }, body: { subject: "Updated subject" } };
    mockPrisma.ticket.findUnique.mockResolvedValue({ id: 1, companyId: 1, contactId: 2 });
  });

  test("updates subject, description, status and priority", async () => {
    req.body = { subject: "Updated subject", description: "Updated description", status: "RESOLVED", priority: "URGENT" };
    const ticket = { id: 1, ...req.body };
    mockPrisma.ticket.update.mockResolvedValueOnce(ticket);
    await updateTicket(req, res, next);
    expect(mockPrisma.ticket.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockPrisma.ticket.update).toHaveBeenCalledWith({ where: { id: 1 }, data: req.body, select: ticketSelect });
    expect(res.json).toHaveBeenCalledWith(ticket);
    expect(next).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  test("connects links and reassigns user with linked contact 2", async () => {
    req.body = { offerId: 3, invoiceId: 4, assignedUserId: 20 };
    mockPrisma.offer.findUnique.mockResolvedValueOnce({ id: 3, companyId: 1, contactId: 2 });
    mockPrisma.invoice.findUnique.mockResolvedValueOnce({ id: 4, companyId: 1, contactId: 2 });
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 20 });
    mockPrisma.ticket.update.mockResolvedValueOnce({ id: 1 });
    await updateTicket(req, res, next);
    expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
      where: { id: 1 }, data: {
        subject: undefined, description: undefined, status: undefined, priority: undefined,
        offer: { connect: { id: 3 } }, invoice: { connect: { id: 4 } },
        assignedUser: { connect: { id: 20 } },
      }, select: ticketSelect,
    });
    expect(mockPrisma.offer.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(mockPrisma.invoice.findUnique).toHaveBeenCalledWith({ where: { id: 4 } });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 20 } });
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
    expect(next).not.toHaveBeenCalled();
  });

  test("connects links and reassigns user with linked contact null", async () => {
    req.body = { offerId: 3, invoiceId: 4, assignedUserId: 20 };
    mockPrisma.offer.findUnique.mockResolvedValueOnce({ id: 3, companyId: 1, contactId: null });
    mockPrisma.invoice.findUnique.mockResolvedValueOnce({ id: 4, companyId: 1, contactId: null });
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 20 });
    mockPrisma.ticket.update.mockResolvedValueOnce({ id: 1 });
    await updateTicket(req, res, next);
    expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
      where: { id: 1 }, data: {
        subject: undefined, description: undefined, status: undefined, priority: undefined,
        offer: { connect: { id: 3 } }, invoice: { connect: { id: 4 } },
        assignedUser: { connect: { id: 20 } },
      }, select: ticketSelect,
    });
    expect(mockPrisma.offer.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(mockPrisma.invoice.findUnique).toHaveBeenCalledWith({ where: { id: 4 } });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 20 } });
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
    expect(next).not.toHaveBeenCalled();
  });

  test("disconnects offer, invoice and assignee with null", async () => {
    req.body = { offerId: null, invoiceId: null, assignedUserId: null };
    mockPrisma.ticket.update.mockResolvedValueOnce({ id: 1 });
    await updateTicket(req, res, next);
    expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
      where: { id: 1 }, data: {
        subject: undefined, description: undefined, status: undefined, priority: undefined,
        offer: { disconnect: true }, invoice: { disconnect: true }, assignedUser: { disconnect: true },
      }, select: ticketSelect,
    });
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects empty update", async () => {
    req.body = {};
    await updateTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: "At least one field is required.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects immutable company", async () => {
    req.body.companyId = 9;
    await updateTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: expect.any(String),
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects immutable contact", async () => {
    req.body.contactId = 9;
    await updateTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: expect.any(String),
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects invalid status", async () => {
    req.body.status = "INVALID";
    await updateTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: expect.any(String),
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects invalid priority", async () => {
    req.body.priority = "INVALID";
    await updateTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: expect.any(String),
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects short description", async () => {
    req.body.description = "Hi";
    await updateTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: "Description must be at least 3 characters.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects nonnumeric ID", async () => {
    req.params.id = "banana";
    await updateTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: "Ticket ID must be a number.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects nonpositive ID", async () => {
    req.params.id = "0";
    await updateTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: "Ticket ID must be a positive number.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects missing ticket", async () => {
    mockPrisma.ticket.findUnique.mockResolvedValueOnce(null);
    await updateTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 404, message: "Ticket not found.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects missing assignee", async () => {
    req.body.assignedUserId = 20; mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    await updateTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 404, message: "Assigned user not found.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects offer missing", async () => {
    req.body.offerId = 3; mockPrisma.offer.findUnique.mockResolvedValueOnce(null);
    await updateTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 404, message: "Offer not found.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects offer wrong company", async () => {
    req.body.offerId = 3; mockPrisma.offer.findUnique.mockResolvedValueOnce({ companyId: 9, contactId: 2 });
    await updateTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: "Offer does not belong to the ticket company.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects offer wrong contact", async () => {
    req.body.offerId = 3; mockPrisma.offer.findUnique.mockResolvedValueOnce({ companyId: 1, contactId: 9 });
    await updateTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: "Offer does not belong to the ticket contact.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects invoice missing", async () => {
    req.body.invoiceId = 3; mockPrisma.invoice.findUnique.mockResolvedValueOnce(null);
    await updateTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 404, message: "Invoice not found.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects invoice wrong company", async () => {
    req.body.invoiceId = 3; mockPrisma.invoice.findUnique.mockResolvedValueOnce({ companyId: 9, contactId: 2 });
    await updateTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: "Invoice does not belong to the ticket company.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects invoice wrong contact", async () => {
    req.body.invoiceId = 3; mockPrisma.invoice.findUnique.mockResolvedValueOnce({ companyId: 1, contactId: 9 });
    await updateTicket(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, message: "Invoice does not belong to the ticket contact.",
    }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  test("maps Prisma P2025 to 404", async () => {
    const error = new Error("Database failed");
    error.code = "P2025";
    mockPrisma.ticket.update.mockRejectedValueOnce(error);
    await updateTicket(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe("Ticket not found.");
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards P2003 update errors", async () => {
    const error = new Error("Database failed");
    error.code = "P2003";
    mockPrisma.ticket.update.mockRejectedValueOnce(error);
    await updateTicket(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
    expect(error.statusCode).toBeUndefined();
    expect(error.message).toBe("Database failed");
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards unexpected update errors", async () => {
    const error = new Error("Database failed");
    mockPrisma.ticket.update.mockRejectedValueOnce(error);
    await updateTicket(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
    expect(error.statusCode).toBeUndefined();
    expect(error.message).toBe("Database failed");
    expect(res.json).not.toHaveBeenCalled();
  });

});
