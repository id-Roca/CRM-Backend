import {
  beforeAll,
  expect,
  jest,
  describe,
  test,
  beforeEach,
} from "@jest/globals";

const mockPrisma = {
  contact: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.unstable_mockModule("../../../src/prisma.js", () => ({
  default: mockPrisma,
}));

let getAllContacts,
  getContactsById,
  createNewContact,
  updateContact,
  deleteContact;

beforeAll(async () => {
  ({
    getAllContacts,
    getContactsById,
    createNewContact,
    updateContact,
    deleteContact,
  } = await import("../../../src/controllers/contactsControllers.js"));
});

describe("getAllContacts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("return all contacts", async () => {
    const fakeContacts = [
      {
        id: 1,
        name: "Anna",
        email: "anna@acme.com",
        companyId: 1,
      },
    ];

    mockPrisma.contact.findMany.mockResolvedValue(fakeContacts);

    const req = {};

    const res = {
      json: jest.fn(),
    };

    const next = jest.fn();

    await getAllContacts(req, res, next);

    expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: {
          id: "asc",
        },
      }),
    );

    expect(res.json).toHaveBeenCalledWith(fakeContacts);

    expect(next).not.toHaveBeenCalled();
  });
});

describe("getContactsById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns one contact", async () => {
    const fakeContact = {
      id: 1,
      name: "Anna",
      email: "anna@acme.com",
      companyId: 1,
    };

    mockPrisma.contact.findUnique.mockResolvedValue(fakeContact);

    const req = {
      params: {
        id: "1",
      },
    };

    const res = {
      json: jest.fn(),
    };

    const next = jest.fn();

    await getContactsById(req, res, next);

    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({
      where: {
        id: 1,
      },
    });
    expect(res.json).toHaveBeenCalledWith(fakeContact);
    expect(next).not.toHaveBeenCalled();
  });

  test("forward 400 when contact ID is not a number", async () => {
    const req = {
      params: {
        id: "banana",
      },
    };
    const res = {
      json: jest.fn(),
    };
    const next = jest.fn();

    await getContactsById(req, res, next);

    expect(mockPrisma.contact.findUnique).not.toHaveBeenCalled();

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Contact ID must be a number.",
        statusCode: 400,
      }),
    );

    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 404 when contact is not found", async () => {
    mockPrisma.contact.findUnique.mockResolvedValue(null);

    const req = {
      params: {
        id: "999",
      },
    };

    const res = {
      json: jest.fn(),
    };

    const next = jest.fn();

    await getContactsById(req, res, next);

    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({
      where: {
        id: 999,
      },
    });

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Contact not found.",
        statusCode: 404,
      }),
    );

    expect(res.json).not.toHaveBeenCalled();
  });
});

describe("createNewContact", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test("creates a new contact", async () => {
    const fakeNewContact = {
      id: 2,
      name: "Bobby",
      email: "bob@acme.com",
      companyId: 1,
    };

    const req = {
      body: {
        id: 2,
        name: "Bobby",
        email: "bob@acme.com",
        companyId: 1,
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const next = jest.fn();

    mockPrisma.contact.create.mockResolvedValue(fakeNewContact);

    await createNewContact(req, res, next);

    expect(mockPrisma.contact.create).toHaveBeenCalledWith({
      data: {
        name: "Bobby",
        email: "bob@acme.com",
        companyId: 1,
      },
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(fakeNewContact);
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards 400 when user data is invalid", async () => {
    const req = {
      body: {
        name: "Al",
        email: "not-an-email",
      },
    };
    const res = {
      status: jest.fn(),
      json: jest.fn(),
    };

    const next = jest.fn();

    await createNewContact(req, res, next);

    expect(mockPrisma.contact.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
      }),
    );
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 409 when email already exists", async () => {
    const duplicateError = new Error();
    duplicateError.code = "P2002";

    mockPrisma.contact.create.mockRejectedValue(duplicateError);

    const req = {
      body: {
        name: "Anna",
        email: "anna@acme.com",
        companyId: 1,
      },
    };

    const res = {
      status: jest.fn(),
      json: jest.fn(),
    };

    const next = jest.fn();

    await createNewContact(req, res, next);

    expect(next).toHaveBeenCalledWith(duplicateError);
    expect(duplicateError.statusCode).toBe(409);
  });
});

describe("updateContact", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("updates a contact and connects its company", async () => {
    const fakeContact = {
      id: 1,
      name: "Anna",
      email: "anna@acme.com",
      companyId: 2,
    };
    mockPrisma.contact.update.mockResolvedValue(fakeContact);

    const req = {
      params: { id: "1" },
      body: { name: "Anna", email: "anna@acme.com", companyId: 2 },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateContact(req, res, next);

    expect(mockPrisma.contact.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        name: "Anna",
        email: "anna@acme.com",
        company: { connect: { id: 2 } },
      },
    });
    expect(res.json).toHaveBeenCalledWith(fakeContact);
    expect(next).not.toHaveBeenCalled();
  });

  test("updates only the provided fields", async () => {
    const fakeContact = {
      id: 1,
      name: "Bobby",
      email: "anna@acme.com",
      companyId: 1,
    };
    mockPrisma.contact.update.mockResolvedValue(fakeContact);

    const req = {
      params: { id: "1" },
      body: { name: "Bobby" },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateContact(req, res, next);

    expect(mockPrisma.contact.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: "Bobby", email: undefined, company: undefined },
    });
    expect(res.json).toHaveBeenCalledWith(fakeContact);
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards 400 when contact data is invalid", async () => {
    const req = {
      params: { id: "1" },
      body: { name: "Al", email: "not-an-email" },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateContact(req, res, next);

    expect(mockPrisma.contact.update).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when no fields are provided", async () => {
    const req = { params: { id: "1" }, body: {} };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateContact(req, res, next);

    expect(mockPrisma.contact.update).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "At least one field is required.",
        statusCode: 400,
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when contact ID is not a number", async () => {
    const req = { params: { id: "banana" }, body: { name: "Anna" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateContact(req, res, next);

    expect(mockPrisma.contact.update).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Contact ID must be a number.",
        statusCode: 400,
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 409 when email already exists", async () => {
    const duplicateError = new Error();
    duplicateError.code = "P2002";
    mockPrisma.contact.update.mockRejectedValue(duplicateError);

    const req = { params: { id: "1" }, body: { email: "anna@acme.com" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateContact(req, res, next);

    expect(next).toHaveBeenCalledWith(duplicateError);
    expect(duplicateError.statusCode).toBe(409);
    expect(duplicateError.message).toBe(
      "A contact with this email already exists.",
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when company does not exist", async () => {
    const companyError = new Error();
    companyError.code = "P2003";
    mockPrisma.contact.update.mockRejectedValue(companyError);

    const req = { params: { id: "1" }, body: { companyId: 999 } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateContact(req, res, next);

    expect(next).toHaveBeenCalledWith(companyError);
    expect(companyError.statusCode).toBe(400);
    expect(companyError.message).toBe("Company does not exist.");
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 404 when contact is not found", async () => {
    const notFoundError = new Error();
    notFoundError.code = "P2025";
    mockPrisma.contact.update.mockRejectedValue(notFoundError);

    const req = { params: { id: "999" }, body: { name: "Anna" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateContact(req, res, next);

    expect(next).toHaveBeenCalledWith(notFoundError);
    expect(notFoundError.statusCode).toBe(404);
    expect(notFoundError.message).toBe("No record was found for an update.");
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards unexpected database errors", async () => {
    const databaseError = new Error("Database unavailable");
    mockPrisma.contact.update.mockRejectedValue(databaseError);

    const req = { params: { id: "1" }, body: { name: "Anna" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateContact(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.message).toBe("Database unavailable");
    expect(databaseError.statusCode).toBeUndefined();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe("deleteContact", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("deletes a contact and returns 204", async () => {
    mockPrisma.contact.delete.mockResolvedValue({ id: 1 });

    const req = { params: { id: "1" } };
    const res = {
      status: jest.fn().mockReturnThis(),
      end: jest.fn(),
    };
    const next = jest.fn();

    await deleteContact(req, res, next);

    expect(mockPrisma.contact.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalledWith();
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards 400 when contact ID is not a number", async () => {
    const req = { params: { id: "banana" } };
    const res = { status: jest.fn().mockReturnThis(), end: jest.fn() };
    const next = jest.fn();

    await deleteContact(req, res, next);

    expect(mockPrisma.contact.delete).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Contact ID must be a number.",
        statusCode: 400,
      }),
    );
    expect(res.status).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });

  test("forwards 404 when contact is not found", async () => {
    const notFoundError = new Error();
    notFoundError.code = "P2025";
    mockPrisma.contact.delete.mockRejectedValue(notFoundError);

    const req = { params: { id: "999" } };
    const res = { status: jest.fn().mockReturnThis(), end: jest.fn() };
    const next = jest.fn();

    await deleteContact(req, res, next);

    expect(mockPrisma.contact.delete).toHaveBeenCalledWith({
      where: { id: 999 },
    });
    expect(next).toHaveBeenCalledWith(notFoundError);
    expect(notFoundError.statusCode).toBe(404);
    expect(notFoundError.message).toBe("Contact not found.");
    expect(res.status).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });

  test("forwards unexpected database errors", async () => {
    const databaseError = new Error("Database unavailable");
    mockPrisma.contact.delete.mockRejectedValue(databaseError);

    const req = { params: { id: "1" } };
    const res = { status: jest.fn().mockReturnThis(), end: jest.fn() };
    const next = jest.fn();

    await deleteContact(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.message).toBe("Database unavailable");
    expect(databaseError.statusCode).toBeUndefined();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });
});
