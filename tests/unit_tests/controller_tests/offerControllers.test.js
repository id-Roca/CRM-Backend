import {
  beforeAll,
  expect,
  jest,
  describe,
  test,
  beforeEach,
} from "@jest/globals";

const mockPrisma = {
  contact: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  offer: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.unstable_mockModule("../../../src/prisma.js", () => ({
  default: mockPrisma,
}));

let getAllOffers, getOfferById, createNewOffer, updateOffer;

beforeAll(async () => {
  ({ getAllOffers, getOfferById, createNewOffer, updateOffer } =
    await import("../../../src/controllers/offerControllers.js"));
});

describe("getAllOffers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns all offers ordered by ID", async () => {
    const offers = [{ id: 1, description: "Consulting offer", amount: 250, status: "DRAFT", company: { name: "Acme" }, contact: { name: "Anna" }, salesUser: { name: "Sales User" } }];
    mockPrisma.offer.findMany.mockResolvedValue(offers);

    const req = {};
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getAllOffers(req, res, next);

    expect(mockPrisma.offer.findMany).toHaveBeenCalledWith({ orderBy: { id: "asc" } });
    expect(res.json).toHaveBeenCalledWith(offers);
    expect(next).not.toHaveBeenCalled();
  });

  test("returns an empty array when no offers exist", async () => {
    mockPrisma.offer.findMany.mockResolvedValue([]);

    const req = {};
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getAllOffers(req, res, next);

    expect(res.json).toHaveBeenCalledWith([]);
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards unexpected database errors", async () => {
    const databaseError = new Error("Database unavailable");
    mockPrisma.offer.findMany.mockRejectedValue(databaseError);

    const req = {};
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getAllOffers(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBeUndefined();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe("getOfferById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns one offer using a numeric ID", async () => {
    const offer = {
      id: 1, description: "Consulting offer", amount: 250, status: "DRAFT",
      company: { id: 1, name: "Acme" },
      contact: { id: 2, name: "Anna", email: "anna@example.com" },
      salesUser: { id: 3, name: "Sales User", role: "SALES" },
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-02T10:00:00.000Z",
    };
    mockPrisma.offer.findUnique.mockResolvedValue(offer);

    const req = { params: { id: "1" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getOfferById(req, res, next);

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
    expect(res.json).toHaveBeenCalledWith(offer);
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards 400 when the ID is not a number", async () => {
    const req = { params: { id: "banana" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getOfferById(req, res, next);

    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: "Offer ID must be a number.",
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when the ID is not positive", async () => {
    const req = { params: { id: "0" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getOfferById(req, res, next);

    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: "Offer ID must be a positive number.",
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when the ID is fractional", async () => {
    const req = { params: { id: "1.5" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getOfferById(req, res, next);

    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 404 when the offer does not exist", async () => {
    mockPrisma.offer.findUnique.mockResolvedValue(null);

    const req = { params: { id: "999" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getOfferById(req, res, next);

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
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: "Offer not found.",
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards unexpected database errors", async () => {
    const databaseError = new Error("Database unavailable");
    mockPrisma.offer.findUnique.mockRejectedValue(databaseError);

    const req = { params: { id: "1" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getOfferById(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBeUndefined();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe("createNewOffer", () => {
  test("creates without a contact and assigns the logged-in SALES user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 10 });
    const offer = { id: 1, contactId: null, salesUserId: 10 };
    mockPrisma.offer.create.mockResolvedValue(offer);

    const req = {
      user: { userId: 10, role: "SALES" },
      body: { description: "Consulting offer", amount: 250, companyId: 1 },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewOffer(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(offer);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockPrisma.offer.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { description: "Consulting offer", amount: 250, companyId: 1, contactId: null, salesUserId: 10 } }),
    );
    expect(mockPrisma.contact.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 10 } });
  });

  test("creates without a contact and assigns the logged-in ADMIN user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 10 });
    const offer = { id: 1, contactId: null, salesUserId: 10 };
    mockPrisma.offer.create.mockResolvedValue(offer);

    const req = {
      user: { userId: 10, role: "ADMIN" },
      body: { description: "Consulting offer", amount: 250, companyId: 1 },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewOffer(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(offer);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockPrisma.offer.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { description: "Consulting offer", amount: 250, companyId: 1, contactId: null, salesUserId: 10 } }),
    );
    expect(mockPrisma.contact.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 10 } });
  });

  test("rejects an explicit salesUserId from a SALES user even when it is their own", async () => {

    const req = {
      user: { userId: 10, role: "SALES" },
      body: { description: "Consulting offer", amount: 250, companyId: 1, salesUserId: 10 },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewOffer(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, message: "Only admins can assign another sales user." }),
    );
    expect(mockPrisma.offer.create).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.contact.findUnique).not.toHaveBeenCalled();
  });

  test("forwards 404 when the selected contact does not exist", async () => {
    mockPrisma.contact.findUnique.mockResolvedValue(null);

    const req = {
      user: { userId: 10, role: "ADMIN" },
      body: { description: "Consulting offer", amount: 250, companyId: 1, contactId: 2 },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewOffer(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: "Contact not found." }),
    );
    expect(mockPrisma.offer.create).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  test("rejects a contact from a different company", async () => {
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 2, companyId: 9 });

    const req = {
      user: { userId: 10, role: "ADMIN" },
      body: { description: "Consulting offer", amount: 250, companyId: 1, contactId: 2 },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewOffer(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: "Contact does not belong to the selected company." }),
    );
    expect(mockPrisma.offer.create).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("forwards 404 when the assigned user does not exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = {
      user: { userId: 10, role: "ADMIN" },
      body: { description: "Consulting offer", amount: 250, companyId: 1, salesUserId: 99 },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewOffer(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: "Sales user not found." }),
    );
    expect(mockPrisma.offer.create).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 99 } });
  });

  test("forwards unexpected contact lookup errors", async () => {
    const databaseError = new Error("Lookup failed");
    mockPrisma.contact.findUnique.mockRejectedValue(databaseError);

    const req = {
      user: { userId: 10, role: "ADMIN" },
      body: { description: "Consulting offer", amount: 250, companyId: 1, contactId: 2 },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewOffer(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(mockPrisma.offer.create).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("forwards unexpected user lookup errors", async () => {
    const databaseError = new Error("Lookup failed");
    mockPrisma.user.findUnique.mockRejectedValue(databaseError);

    const req = {
      user: { userId: 10, role: "ADMIN" },
      body: { description: "Consulting offer", amount: 250, companyId: 1 },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewOffer(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(mockPrisma.offer.create).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 2, companyId: 1 });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 3 });
  });

  test("creates an offer and returns selected data with status 201", async () => {
    const offer = { id: 1, description: "Consulting offer", amount: 250, status: "DRAFT", company: { name: "Acme" }, contact: { name: "Anna" }, salesUser: { name: "Sales User" } };
    mockPrisma.offer.create.mockResolvedValue(offer);

    const req = { user: { userId: 10, role: "ADMIN" }, body: { description: "Consulting offer", amount: 250, companyId: 1, contactId: 2, salesUserId: 3 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewOffer(req, res, next);

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
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(offer);
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards 400 when the amount is not positive", async () => {
    const req = { user: { userId: 10, role: "ADMIN" }, body: { description: "Consulting offer", amount: 0, companyId: 1, contactId: 2, salesUserId: 3 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewOffer(req, res, next);

    expect(mockPrisma.offer.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: "Amount must be greater than 0.",
      }),
    );
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when a related record does not exist", async () => {
    const databaseError = new Error("Database unavailable");
    databaseError.code = "P2003";
    mockPrisma.offer.create.mockRejectedValue(databaseError);

    const req = { user: { userId: 10, role: "ADMIN" }, body: { description: "Consulting offer", amount: 250, companyId: 1, contactId: 2, salesUserId: 3 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewOffer(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBe(400);
    expect(databaseError.message).toBe("Company or sales user does not exist.");
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards unexpected database errors", async () => {
    const databaseError = new Error("Database unavailable");
    mockPrisma.offer.create.mockRejectedValue(databaseError);

    const req = { user: { userId: 10, role: "ADMIN" }, body: { description: "Consulting offer", amount: 250, companyId: 1, contactId: 2, salesUserId: 3 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewOffer(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBeUndefined();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe("updateOffer", () => {
  test("rejects reassignment by a SALES user before any offer lookup", async () => {

    const req = {
      user: { userId: 10, role: "SALES" },
      params: { id: "1" },
      body: { salesUserId: 10 },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, message: "Only admins can reassign an offer." }),
    );
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  test("forwards 404 when the existing offer lookup finds nothing", async () => {
    mockPrisma.offer.findUnique.mockResolvedValue(null);

    const req = {
      user: { userId: 10, role: "ADMIN" },
      params: { id: "1" },
      body: { status: "SENT" },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: "Offer not found." }),
    );
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  test("allows a SALES user to cancel without reassigning an offer", async () => {
    const offer = { id: 1, status: "CANCELLED", salesUserId: 3 };
    mockPrisma.offer.update.mockResolvedValue(offer);

    const req = {
      user: { userId: 10, role: "SALES" },
      params: { id: "1" },
      body: { status: "CANCELLED" },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(offer);
    expect(mockPrisma.offer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { description: undefined, amount: undefined, companyId: undefined, contactId: undefined, salesUserId: undefined, status: "CANCELLED" } }),
    );
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.contact.findUnique).not.toHaveBeenCalled();
  });

  test("retains the assignee when an ADMIN omits salesUserId", async () => {
    const offer = { id: 1, amount: 500, salesUserId: 3 };
    mockPrisma.offer.update.mockResolvedValue(offer);

    const req = {
      user: { userId: 10, role: "ADMIN" },
      params: { id: "1" },
      body: { amount: 500 },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(offer);
    expect(mockPrisma.offer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { description: undefined, amount: 500, companyId: undefined, contactId: undefined, salesUserId: undefined, status: undefined } }),
    );
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  test("validates a new contact against the existing company", async () => {
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 7, companyId: 1 });
    const offer = { id: 1, companyId: 1, contactId: 7 };
    mockPrisma.offer.update.mockResolvedValue(offer);

    const req = {
      user: { userId: 10, role: "ADMIN" },
      params: { id: "1" },
      body: { contactId: 7 },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(offer);
    expect(mockPrisma.offer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { description: undefined, amount: undefined, companyId: undefined, contactId: 7, salesUserId: undefined, status: undefined } }),
    );
    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 7 } });
  });

  test("rejects changing the company when the retained contact belongs elsewhere", async () => {
    mockPrisma.offer.findUnique.mockResolvedValue({ id: 1, companyId: 1, contactId: 2, salesUserId: 3 });
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 2, companyId: 1 });

    const req = {
      user: { userId: 10, role: "ADMIN" },
      params: { id: "1" },
      body: { companyId: 4 },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: "Contact does not belong to the selected company." }),
    );
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
  });

  test("rejects a new contact from a different company", async () => {
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 7, companyId: 9 });

    const req = {
      user: { userId: 10, role: "ADMIN" },
      params: { id: "1" },
      body: { contactId: 7 },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: "Contact does not belong to the selected company." }),
    );
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 404 when the selected contact does not exist", async () => {
    mockPrisma.contact.findUnique.mockResolvedValue(null);

    const req = {
      user: { userId: 10, role: "ADMIN" },
      params: { id: "1" },
      body: { contactId: 7 },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: "Contact not found." }),
    );
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 404 when the reassigned user does not exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = {
      user: { userId: 10, role: "ADMIN" },
      params: { id: "1" },
      body: { salesUserId: 99 },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: "Sales user not found." }),
    );
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 99 } });
  });

  test("rejects null contactId rather than removing the contact", async () => {

    const req = {
      user: { userId: 10, role: "ADMIN" },
      params: { id: "1" },
      body: { contactId: null },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.offer.findUnique).not.toHaveBeenCalled();
  });

  test("forwards unexpected offer lookup errors", async () => {
    const databaseError = new Error("Lookup failed");
    mockPrisma.offer.findUnique.mockRejectedValue(databaseError);

    const req = {
      user: { userId: 10, role: "ADMIN" },
      params: { id: "1" },
      body: { status: "SENT" },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards unexpected contact lookup errors", async () => {
    const databaseError = new Error("Lookup failed");
    mockPrisma.contact.findUnique.mockRejectedValue(databaseError);

    const req = {
      user: { userId: 10, role: "ADMIN" },
      params: { id: "1" },
      body: { contactId: 7 },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards unexpected user lookup errors", async () => {
    const databaseError = new Error("Lookup failed");
    mockPrisma.user.findUnique.mockRejectedValue(databaseError);

    const req = {
      user: { userId: 10, role: "ADMIN" },
      params: { id: "1" },
      body: { salesUserId: 99 },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.offer.findUnique.mockResolvedValue({ id: 1, companyId: 1, contactId: null, salesUserId: 3 });
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 5, companyId: 4 });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 6 });
  });

  test("updates all supported fields and returns selected data", async () => {
    const offer = { id: 1, description: "Updated offer", amount: 500, status: "SENT", company: { name: "Acme" }, contact: { name: "Anna" }, salesUser: { name: "Sales User" } };
    mockPrisma.offer.update.mockResolvedValue(offer);

    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { description: "Updated offer", amount: 500, companyId: 4, contactId: 5, salesUserId: 6, status: "SENT" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

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
    expect(res.json).toHaveBeenCalledWith(offer);
    expect(next).not.toHaveBeenCalled();
  });

  test("updates status without requiring other fields", async () => {
    const offer = { id: 1, status: "ACCEPTED" };
    mockPrisma.offer.update.mockResolvedValue(offer);

    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { status: "ACCEPTED" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(mockPrisma.offer.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { description: undefined, amount: undefined, companyId: undefined, contactId: undefined, salesUserId: undefined, status: "ACCEPTED" },
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
    expect(res.json).toHaveBeenCalledWith(offer);
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards 400 when no fields are provided", async () => {
    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: {} };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: "At least one field is required.",
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when the status is invalid", async () => {
    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { status: "PAID" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when the amount is not positive", async () => {
    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { amount: 0 } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: "Amount must be greater than 0.",
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when the description is too short", async () => {
    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { description: "Hi" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: "Description must be at least 3 characters.",
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when a related record ID is not an integer", async () => {
    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { contactId: 1.5 } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when the offer ID is invalid", async () => {
    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "banana" }, body: { status: "SENT" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(mockPrisma.offer.update).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: "Offer ID must be a number.",
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 404 when the offer does not exist", async () => {
    const databaseError = new Error("Database unavailable");
    databaseError.code = "P2025";
    mockPrisma.offer.update.mockRejectedValue(databaseError);

    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { status: "SENT" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBe(404);
    expect(databaseError.message).toBe("Offer not found.");
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when a related record does not exist", async () => {
    const databaseError = new Error("Database unavailable");
    databaseError.code = "P2003";
    mockPrisma.offer.update.mockRejectedValue(databaseError);

    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { companyId: 999 } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBe(400);
    expect(databaseError.message).toBe("Company, contact, or sales user does not exist.");
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards unexpected database errors", async () => {
    const databaseError = new Error("Database unavailable");
    mockPrisma.offer.update.mockRejectedValue(databaseError);

    const req = { user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: { status: "SENT" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateOffer(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.statusCode).toBeUndefined();
    expect(res.json).not.toHaveBeenCalled();
  });
});
