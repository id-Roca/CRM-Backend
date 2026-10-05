import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";

const mockPrisma = {
  invoice: {
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

jest.unstable_mockModule("../../../src/prisma.js", () => ({
  default: mockPrisma,
}));

let getAllInvoices, getInvoiceById, createNewInvoice, updateInvoice;

beforeAll(async () => {
  ({ getAllInvoices, getInvoiceById, createNewInvoice, updateInvoice } =
    await import("../../../src/controllers/invoiceControllers.js"));
});

describe("getAllInvoices", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("returns invoices ordered by ID", async () => {
    const invoices = [{ id: 1, companyName: "Acme", amount: 250 }];
    mockPrisma.invoice.findMany.mockResolvedValue(invoices);

    const req = {};
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getAllInvoices(req, res, next);

    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({ orderBy: { id: "asc" } });
    expect(res.json).toHaveBeenCalledWith(invoices);
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards unexpected database errors", async () => {
    const databaseError = new Error("Database failed");
    mockPrisma.invoice.findMany.mockRejectedValue(databaseError);

    const req = {};
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getAllInvoices(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBeUndefined();
    expect(databaseError.message).toBe("Database failed");
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe("getInvoiceById", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("returns one invoice using a numeric ID", async () => {
    const invoice = { id: 1, amount: 250 };
    mockPrisma.invoice.findUnique.mockResolvedValue(invoice);

    const req = { params: { id: "1" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getInvoiceById(req, res, next);

    expect(mockPrisma.invoice.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(res.json).toHaveBeenCalledWith(invoice);
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects a nonnumeric ID", async () => {
    const req = { params: { id: "banana" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getInvoiceById(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: "Invoice ID must be a number." }),
    );
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("rejects a nonpositive ID", async () => {
    const req = { params: { id: "0" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getInvoiceById(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: "invoice ID must be a positive number." }),
    );
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("returns 404 when the invoice does not exist", async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue(null);

    const req = { params: { id: "99" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getInvoiceById(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: "Invoice not found." }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards unexpected database errors", async () => {
    const databaseError = new Error("Database failed");
    mockPrisma.invoice.findUnique.mockRejectedValue(databaseError);

    const req = { params: { id: "1" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getInvoiceById(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBeUndefined();
    expect(databaseError.message).toBe("Database failed");
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe("createNewInvoice", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPrisma.company.findUnique.mockResolvedValue({ id: 1, name: "Acme" });
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 2, companyId: 1, name: "Anna" });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 10, name: "Current User" });
  });

  test("copies accepted offer values, assignee, and snapshot names", async () => {
    const offer = { id: 8, status: "ACCEPTED", description: "Accepted work", amount: 900, companyId: 1, contactId: 2, salesUserId: 3, company: { name: "Offer Company" }, contact: { name: "Offer Contact" }, salesUser: { name: "Offer Sales" } };
    mockPrisma.offer.findUnique.mockResolvedValue(offer);
    const invoice = { id: 1, offerId: 8 };
    mockPrisma.invoice.create.mockResolvedValue(invoice);

    const req = { user: { userId: 10, role: "SALES" }, body: { offerId: 8 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(mockPrisma.invoice.create).toHaveBeenCalledWith({ data: { offer: { connect: { id: 8 } }, company: { connect: { id: 1 } }, contact: { connect: { id: 2 } }, salesUser: { connect: { id: 3 } }, companyName: "Offer Company", contactName: "Offer Contact", salesUserName: "Offer Sales", description: "Accepted work", amount: 900 } });
    expect(res.json).toHaveBeenCalledWith(invoice);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockPrisma.offer.findUnique).toHaveBeenCalledWith({ where: { id: 8 }, include: { company: true, contact: true, salesUser: true } });
    expect(mockPrisma.company.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  test("creates from an accepted offer without a contact", async () => {
    const offer = { id: 8, status: "ACCEPTED", description: "Accepted work", amount: 900, companyId: 1, contactId: 2, salesUserId: 3, company: { name: "Offer Company" }, contact: { name: "Offer Contact" }, salesUser: { name: "Offer Sales" } };
    offer.contactId = null;
    offer.contact = null;
    mockPrisma.offer.findUnique.mockResolvedValue(offer);
    const invoice = { id: 1, offerId: 8 };
    mockPrisma.invoice.create.mockResolvedValue(invoice);

    const req = { user: { userId: 10, role: "SALES" }, body: { offerId: 8 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(mockPrisma.invoice.create).toHaveBeenCalledWith({ data: { offer: { connect: { id: 8 } }, company: { connect: { id: 1 } }, salesUser: { connect: { id: 3 } }, companyName: "Offer Company", contactName: null, salesUserName: "Offer Sales", description: "Accepted work", amount: 900 } });
    expect(res.json).toHaveBeenCalledWith(invoice);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockPrisma.offer.findUnique).toHaveBeenCalledWith({ where: { id: 8 }, include: { company: true, contact: true, salesUser: true } });
    expect(mockPrisma.company.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  test("rejects an offer that is not accepted", async () => {
    mockPrisma.offer.findUnique.mockResolvedValue({ ...{ id: 8, status: "ACCEPTED", description: "Accepted work", amount: 900, companyId: 1, contactId: 2, salesUserId: 3, company: { name: "Offer Company" }, contact: { name: "Offer Contact" }, salesUser: { name: "Offer Sales" } }, status: "SENT" });

    const req = { user: { userId: 10, role: "ADMIN" }, body: { offerId: 8 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: "An invoice can only be created from an accepted offer." }),
    );
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("returns 404 when the offer is missing", async () => {
    mockPrisma.offer.findUnique.mockResolvedValue(null);

    const req = { user: { userId: 10, role: "ADMIN" }, body: { offerId: 8 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: "Offer not found." }),
    );
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("rejects extra fields that try to override offer values", async () => {
    const req = { user: { userId: 10, role: "ADMIN" }, body: { offerId: 8, amount: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
  });

  test("rejects an invalid offer ID", async () => {
    const req = { user: { userId: 10, role: "ADMIN" }, body: { offerId: 0 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("rejects invalid direct invoice amounts", async () => {
    const req = { user: { userId: 10, role: "ADMIN" }, body: { description: "Consulting", amount: 0, companyId: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: "Amount must be greater than 0." }),
    );
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("rejects client-supplied snapshot names", async () => {
    const req = { user: { userId: 10, role: "ADMIN" }, body: { description: "Consulting", amount: 250, companyId: 1, companyName: "Spoofed" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("creates without a contact using the authenticated SALES user", async () => {
    const invoice = { id: 1, contactName: null };
    mockPrisma.invoice.create.mockResolvedValue(invoice);

    const req = { user: { userId: 10, role: "SALES" }, body: { description: "Consulting", amount: 250, companyId: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(mockPrisma.invoice.create).toHaveBeenCalledWith({ data: { company: { connect: { id: 1 } }, salesUser: { connect: { id: 10 } }, companyName: "Acme", contactName: null, salesUserName: "Current User", description: "Consulting", amount: 250 } });
    expect(res.json).toHaveBeenCalledWith(invoice);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(mockPrisma.contact.findUnique).not.toHaveBeenCalled();
  });

  test("creates without a contact using the authenticated ADMIN user", async () => {
    const invoice = { id: 1, contactName: null };
    mockPrisma.invoice.create.mockResolvedValue(invoice);

    const req = { user: { userId: 10, role: "ADMIN" }, body: { description: "Consulting", amount: 250, companyId: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(mockPrisma.invoice.create).toHaveBeenCalledWith({ data: { company: { connect: { id: 1 } }, salesUser: { connect: { id: 10 } }, companyName: "Acme", contactName: null, salesUserName: "Current User", description: "Consulting", amount: 250 } });
    expect(res.json).toHaveBeenCalledWith(invoice);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(mockPrisma.contact.findUnique).not.toHaveBeenCalled();
  });

  test("allows an ADMIN to assign another user and snapshots the selected contact", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 3, name: "Assigned User" });
    const invoice = { id: 1, salesUserName: "Assigned User" };
    mockPrisma.invoice.create.mockResolvedValue(invoice);

    const req = { user: { userId: 10, role: "ADMIN" }, body: { description: "Consulting", amount: 250, companyId: 1, contactId: 2, salesUserId: 3 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(mockPrisma.invoice.create).toHaveBeenCalledWith({ data: { company: { connect: { id: 1 } }, contact: { connect: { id: 2 } }, salesUser: { connect: { id: 3 } }, companyName: "Acme", contactName: "Anna", salesUserName: "Assigned User", description: "Consulting", amount: 250 } });
    expect(res.json).toHaveBeenCalledWith(invoice);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
  });

  test("rejects explicit assignment by SALES even to himself", async () => {
    const req = { user: { userId: 10, role: "SALES" }, body: { description: "Consulting", amount: 250, companyId: 1, salesUserId: 10 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, message: "Only admins can assign another sales user." }),
    );
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(mockPrisma.company.findUnique).not.toHaveBeenCalled();
  });

  test("returns 404 when the direct invoice company is missing", async () => {
    mockPrisma.company.findUnique.mockResolvedValue(null);

    const req = { user: { userId: 10, role: "ADMIN" }, body: { description: "Consulting", amount: 250, companyId: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: "Company not found." }),
    );
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("returns 404 when the direct invoice contact is missing", async () => {
    mockPrisma.contact.findUnique.mockResolvedValue(null);

    const req = { user: { userId: 10, role: "ADMIN" }, body: { description: "Consulting", amount: 250, companyId: 1, contactId: 2 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: "Contact not found." }),
    );
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("returns 404 when the direct invoice user is missing", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = { user: { userId: 10, role: "ADMIN" }, body: { description: "Consulting", amount: 250, companyId: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: "Sales user not found." }),
    );
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("rejects a contact belonging to another company", async () => {
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 2, companyId: 9, name: "Anna" });

    const req = { user: { userId: 10, role: "ADMIN" }, body: { description: "Consulting", amount: 250, companyId: 1, contactId: 2 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: "Contact does not belong to the selected company." }),
    );
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("forwards unexpected offer lookup errors", async () => {
    const databaseError = new Error("Database failed");
    mockPrisma.offer.findUnique.mockRejectedValue(databaseError);

    const req = { user: { userId: 10, role: "ADMIN" }, body: { offerId: 8 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBeUndefined();
    expect(databaseError.message).toBe("Database failed");
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("forwards unexpected company lookup errors", async () => {
    const databaseError = new Error("Database failed");
    mockPrisma.company.findUnique.mockRejectedValue(databaseError);

    const req = { user: { userId: 10, role: "ADMIN" }, body: { description: "Consulting", amount: 250, companyId: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBeUndefined();
    expect(databaseError.message).toBe("Database failed");
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("forwards unexpected contact lookup errors", async () => {
    const databaseError = new Error("Database failed");
    mockPrisma.contact.findUnique.mockRejectedValue(databaseError);

    const req = { user: { userId: 10, role: "ADMIN" }, body: { description: "Consulting", amount: 250, companyId: 1, contactId: 2 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBeUndefined();
    expect(databaseError.message).toBe("Database failed");
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("forwards unexpected user lookup errors", async () => {
    const databaseError = new Error("Database failed");
    mockPrisma.user.findUnique.mockRejectedValue(databaseError);

    const req = { user: { userId: 10, role: "ADMIN" }, body: { description: "Consulting", amount: 250, companyId: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBeUndefined();
    expect(databaseError.message).toBe("Database failed");
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("forwards Prisma foreign-key errors without assigning a status", async () => {
    const databaseError = new Error("Database failed");
    databaseError.code = "P2003";
    mockPrisma.invoice.create.mockRejectedValue(databaseError);

    const req = { user: { userId: 10, role: "ADMIN" }, body: { description: "Consulting", amount: 250, companyId: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBeUndefined();
    expect(databaseError.message).toBe("Database failed");
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("forwards unexpected errors when creating from an offer", async () => {
    mockPrisma.offer.findUnique.mockResolvedValue({ id: 8, status: "ACCEPTED", description: "Accepted work", amount: 900, companyId: 1, contactId: 2, salesUserId: 3, company: { name: "Offer Company" }, contact: { name: "Offer Contact" }, salesUser: { name: "Offer Sales" } });
    const databaseError = new Error("Database failed");
    mockPrisma.invoice.create.mockRejectedValue(databaseError);

    const req = { user: { userId: 10, role: "ADMIN" }, body: { offerId: 8 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBeUndefined();
    expect(databaseError.message).toBe("Database failed");
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("updateInvoice", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPrisma.invoice.findUnique.mockResolvedValue({ id: 1, companyId: 1, contactId: null, salesUserId: 3 });
    mockPrisma.company.findUnique.mockResolvedValue({ id: 4, name: "New Company" });
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 5, companyId: 4, name: "New Contact" });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 6, name: "New User" });
  });

  test("updates all fields and refreshes relationship snapshot names for ADMIN", async () => {
    const invoice = { id: 1, companyName: "New Company", contactName: "New Contact", salesUserName: "New User" };
    mockPrisma.invoice.update.mockResolvedValue(invoice);

    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { description: "Updated work", amount: 500, status: "ISSUED", companyId: 4, contactId: 5, salesUserId: 6 } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateInvoice(req, res, next);

    expect(mockPrisma.invoice.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { description: "Updated work", amount: 500, status: "ISSUED", companyId: 4, companyName: "New Company", contactId: 5, contactName: "New Contact", salesUserId: 6, salesUserName: "New User" } });
    expect(res.json).toHaveBeenCalledWith(invoice);
    expect(next).not.toHaveBeenCalled();
    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({ where: { id: 4 } });
    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 6 } });
  });

  test("updates status without changing existing snapshot names or the assignee", async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue({ id: 1, companyId: 4, contactId: 5, salesUserId: 6, contactName: "Original Contact" });
    const invoice = { id: 1, status: "PAID", contactName: "Original Contact" };
    mockPrisma.invoice.update.mockResolvedValue(invoice);

    const req = { user: { userId: 10, role: "SALES" }, params: { id: "1" }, body: { status: "PAID" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateInvoice(req, res, next);

    expect(mockPrisma.invoice.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { description: undefined, amount: undefined, status: "PAID" } });
    expect(res.json).toHaveBeenCalledWith(invoice);
    expect(next).not.toHaveBeenCalled();
    expect(mockPrisma.company.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  test("allows an ADMIN to cancel an invoice without a contact or reassignment", async () => {
    const invoice = { id: 1, status: "CANCELLED" };
    mockPrisma.invoice.update.mockResolvedValue(invoice);

    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { status: "CANCELLED" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateInvoice(req, res, next);

    expect(mockPrisma.invoice.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { description: undefined, amount: undefined, status: "CANCELLED" } });
    expect(res.json).toHaveBeenCalledWith(invoice);
    expect(next).not.toHaveBeenCalled();
    expect(mockPrisma.contact.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  test("rejects non-admin reassignment", async () => {
    const req = { user: { userId: 10, role: "SALES" }, params: { id: "1" }, body: { salesUserId: 6 } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, message: "Only admins can reassign an invoice." }),
    );
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
  });

  test("rejects an empty update", async () => {
    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: {} };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: "At least one field is required." }),
    );
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("rejects an invalid status", async () => {
    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { status: "ACCEPTED" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("rejects a nonpositive amount", async () => {
    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { amount: 0 } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: "Amount must be greater than 0." }),
    );
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("rejects an invalid invoice ID", async () => {
    const req = { params: { id: "banana" }, user: { userId: 10, role: "ADMIN" }, body: { status: "PAID" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: "Invoice ID must be a number." }),
    );
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("returns 404 when the existing invoice is missing", async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue(null);

    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { status: "PAID" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: "Invoice not found." }),
    );
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("returns 404 when the selected company is missing", async () => {
    mockPrisma.company.findUnique.mockResolvedValue(null);

    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { companyId: 4 } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: "Company not found." }),
    );
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("returns 404 when the selected contact is missing", async () => {
    mockPrisma.contact.findUnique.mockResolvedValue(null);

    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { contactId: 5 } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: "Contact not found." }),
    );
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("returns 404 when the selected user is missing", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { salesUserId: 6 } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: "Sales user not found." }),
    );
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("checks a new contact against the existing company", async () => {
    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { contactId: 5 } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: "Contact does not belong to the selected company." }),
    );
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("rejects changing company when the retained contact belongs elsewhere", async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue({ id: 1, companyId: 1, contactId: 2 });
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 2, companyId: 1, name: "Anna" });

    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { companyId: 4 } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: "Contact does not belong to the selected company." }),
    );
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("maps Prisma P2025 to 404 when the write cannot find the invoice", async () => {
    const databaseError = new Error("Database failed");
    databaseError.code = "P2025";
    mockPrisma.invoice.update.mockRejectedValue(databaseError);

    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { status: "PAID" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBe(404);
    expect(databaseError.message).toBe("Invoice not found.");
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards Prisma P2003 errors unchanged", async () => {
    const databaseError = new Error("Database failed");
    databaseError.code = "P2003";
    mockPrisma.invoice.update.mockRejectedValue(databaseError);

    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { status: "PAID" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBeUndefined();
    expect(databaseError.message).toBe("Database failed");
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards unexpected update errors", async () => {
    const databaseError = new Error("Database failed");
    mockPrisma.invoice.update.mockRejectedValue(databaseError);

    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { status: "PAID" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBeUndefined();
    expect(databaseError.message).toBe("Database failed");
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards unexpected invoice lookup errors", async () => {
    const databaseError = new Error("Database failed");
    mockPrisma.invoice.findUnique.mockRejectedValue(databaseError);

    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { status: "PAID" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBeUndefined();
    expect(databaseError.message).toBe("Database failed");
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
