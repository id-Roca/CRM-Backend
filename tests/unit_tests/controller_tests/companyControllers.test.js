import {
  beforeAll,
  expect,
  jest,
  describe,
  test,
  beforeEach,
} from "@jest/globals";

const mockPrisma = {
  company: {
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

let getAllCompanies,
  getCompaniesById,
  createNewCompany,
  updateCompany,
  deleteCompany;

beforeAll(async () => {
  ({
    getAllCompanies,
    getCompaniesById,
    createNewCompany,
    updateCompany,
    deleteCompany,
  } = await import("../../../src/controllers/companyControllers.js"));
});

describe("getAllCompanies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns all companies", async () => {
    const fakeCompanies = [{ id: 1, name: "Acme", industry: "Technology" }];
    mockPrisma.company.findMany.mockResolvedValue(fakeCompanies);

    const req = { query: {} };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getAllCompanies(req, res, next);

    expect(mockPrisma.company.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { id: "asc" },
    });
    expect(res.json).toHaveBeenCalledWith(fakeCompanies);
    expect(next).not.toHaveBeenCalled();
  });

  test("returns an empty array when no companies exist", async () => {
    mockPrisma.company.findMany.mockResolvedValue([]);

    const req = { query: {} };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getAllCompanies(req, res, next);

    expect(mockPrisma.company.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { id: "asc" },
    });
    expect(res.json).toHaveBeenCalledWith([]);
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards database errors to next", async () => {
    const databaseError = new Error("Database unavailable");
    mockPrisma.company.findMany.mockRejectedValue(databaseError);

    const req = { query: {} };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getAllCompanies(req, res, next);

    expect(mockPrisma.company.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { id: "asc" },
    });
    expect(next).toHaveBeenCalledWith(databaseError);
    expect(res.json).not.toHaveBeenCalled();
  });

  test("trims search and passes case-insensitive matching to Prisma", async () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    const records = [{"id":1,"name":"Acme","industry":"Technology"}];
    mockPrisma.company.findMany.mockResolvedValueOnce(records);
    await getAllCompanies({ user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, query: {"search":"  AcMe  "} }, res, next);
    expect(mockPrisma.company.findMany).toHaveBeenCalledWith({
      where: {"name":{"contains":"AcMe","mode":"insensitive"}}, orderBy: { id: "asc" },
    });
    expect(res.json).toHaveBeenCalledWith(records);
    expect(next).not.toHaveBeenCalled();
  });

  test("returns an empty array for no search matches", async () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    const records = [];
    mockPrisma.company.findMany.mockResolvedValueOnce(records);
    await getAllCompanies({ user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, query: {"search":"absent"} }, res, next);
    expect(mockPrisma.company.findMany).toHaveBeenCalledWith({
      where: {"name":{"contains":"absent","mode":"insensitive"}}, orderBy: { id: "asc" },
    });
    expect(res.json).toHaveBeenCalledWith(records);
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects invalid search \"   \"", async () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await getAllCompanies({ user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, query: {"search":"   "} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: "Search must contain at least one character." }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.company.findMany).not.toHaveBeenCalled();
  });

  test("rejects invalid search [\"Anna\",\"Acme\"]", async () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await getAllCompanies({ user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, query: {"search":["Anna","Acme"]} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: expect.any(String) }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.company.findMany).not.toHaveBeenCalled();
  });

  test("rejects unknown query parameters", async () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await getAllCompanies({ user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, query: {"unexpected":"value"} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: expect.any(String) }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.company.findMany).not.toHaveBeenCalled();

  });
});

describe("getCompaniesById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns one company", async () => {
    const fakeCompany = { id: 1, name: "Acme", industry: "Technology" };
    mockPrisma.company.findUnique.mockResolvedValue(fakeCompany);

    const req = { params: { id: "1" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getCompaniesById(req, res, next);

    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(res.json).toHaveBeenCalledWith(fakeCompany);
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards 400 when company ID is not a number", async () => {
    const req = { params: { id: "banana" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getCompaniesById(req, res, next);

    expect(mockPrisma.company.findUnique).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Company ID must be a number.",
        statusCode: 400,
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 404 when company is not found", async () => {
    mockPrisma.company.findUnique.mockResolvedValue(null);

    const req = { params: { id: "999" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getCompaniesById(req, res, next);

    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({
      where: { id: 999 },
    });
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Company not found.",
        statusCode: 404,
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards database errors to next", async () => {
    const databaseError = new Error("Database unavailable");
    mockPrisma.company.findUnique.mockRejectedValue(databaseError);

    const req = { params: { id: "1" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await getCompaniesById(req, res, next);

    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(next).toHaveBeenCalledWith(databaseError);
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe("createNewCompany", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("creates a new company", async () => {
    const fakeCompany = { id: 1, name: "Acme", industry: "Technology" };
    mockPrisma.company.create.mockResolvedValue(fakeCompany);

    const req = { body: { name: "Acme", industry: "Technology" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewCompany(req, res, next);

    expect(mockPrisma.company.create).toHaveBeenCalledWith({
      data: { name: "Acme", industry: "Technology" },
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(fakeCompany);
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards 409 when company name already exists", async () => {
    const duplicateError = new Error();
    duplicateError.code = "P2002";
    mockPrisma.company.create.mockRejectedValue(duplicateError);

    const req = { body: { name: "Acme", industry: "Technology" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewCompany(req, res, next);

    expect(mockPrisma.company.create).toHaveBeenCalledWith({
      data: { name: "Acme", industry: "Technology" },
    });
    expect(next).toHaveBeenCalledWith(duplicateError);
    expect(duplicateError.statusCode).toBe(409);
    expect(duplicateError.message).toBe("A company with this name already exists.");
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when company name is invalid", async () => {
    const req = { body: { name: "Al", industry: "Technology" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewCompany(req, res, next);

    expect(mockPrisma.company.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Name must be at least 3 characters.",
        statusCode: 400,
      }),
    );
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when industry is invalid", async () => {
    const req = { body: { name: "Acme", industry: "IT" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewCompany(req, res, next);

    expect(mockPrisma.company.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Industry must be at least 3 characters.",
        statusCode: 400,
      }),
    );
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when required fields are missing", async () => {
    const req = { body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewCompany(req, res, next);

    expect(mockPrisma.company.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards database errors to next", async () => {
    const databaseError = new Error("Database unavailable");
    mockPrisma.company.create.mockRejectedValue(databaseError);

    const req = { body: { name: "Acme", industry: "Technology" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await createNewCompany(req, res, next);

    expect(mockPrisma.company.create).toHaveBeenCalledWith({
      data: { name: "Acme", industry: "Technology" },
    });
    expect(next).toHaveBeenCalledWith(databaseError);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("rejects unexpected fields alongside valid data", async () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await createNewCompany({ user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: {"name":"Acme","industry":"Technology","unexpected":"value"} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: expect.any(String) }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.company.create).not.toHaveBeenCalled();
  });
});

describe("updateCompany", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("updates a company", async () => {
    const fakeCompany = { id: 1, name: "Acme", industry: "Technology" };
    mockPrisma.company.update.mockResolvedValue(fakeCompany);

    const req = {
      params: { id: "1" },
      body: { name: "Acme", industry: "Technology" },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateCompany(req, res, next);

    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: "Acme", industry: "Technology" },
    });
    expect(res.json).toHaveBeenCalledWith(fakeCompany);
    expect(next).not.toHaveBeenCalled();
  });

  test("updates only the provided fields", async () => {
    const fakeCompany = { id: 1, name: "Acme", industry: "Technology" };
    mockPrisma.company.update.mockResolvedValue(fakeCompany);

    const req = { params: { id: "1" }, body: { name: "Acme" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateCompany(req, res, next);

    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: "Acme", industry: undefined },
    });
    expect(res.json).toHaveBeenCalledWith(fakeCompany);
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards 409 when company name already exists", async () => {
    const duplicateError = new Error();
    duplicateError.code = "P2002";
    mockPrisma.company.update.mockRejectedValue(duplicateError);

    const req = { params: { id: "1" }, body: { name: "Acme" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateCompany(req, res, next);

    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: "Acme", industry: undefined },
    });
    expect(next).toHaveBeenCalledWith(duplicateError);
    expect(duplicateError.statusCode).toBe(409);
    expect(duplicateError.message).toBe("A company with this name already exists.");
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when company data is invalid", async () => {
    const req = { params: { id: "1" }, body: { name: "Al" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateCompany(req, res, next);

    expect(mockPrisma.company.update).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Name must be at least 3 characters.",
        statusCode: 400,
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when no fields are provided", async () => {
    const req = { params: { id: "1" }, body: {} };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateCompany(req, res, next);

    expect(mockPrisma.company.update).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "At least one field is required.",
        statusCode: 400,
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 400 when company ID is not a number", async () => {
    const req = { params: { id: "banana" }, body: { name: "Acme" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateCompany(req, res, next);

    expect(mockPrisma.company.update).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Company ID must be a number.",
        statusCode: 400,
      }),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards 404 when company is not found", async () => {
    const notFoundError = new Error();
    notFoundError.code = "P2025";
    mockPrisma.company.update.mockRejectedValue(notFoundError);

    const req = { params: { id: "999" }, body: { name: "Acme" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateCompany(req, res, next);

    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: 999 },
      data: { name: "Acme", industry: undefined },
    });
    expect(next).toHaveBeenCalledWith(notFoundError);
    expect(notFoundError.statusCode).toBe(404);
    expect(notFoundError.message).toBe("No record was found for an update.");
    expect(res.json).not.toHaveBeenCalled();
  });

  test("forwards unexpected database errors", async () => {
    const databaseError = new Error("Database unavailable");
    mockPrisma.company.update.mockRejectedValue(databaseError);

    const req = { params: { id: "1" }, body: { name: "Acme" } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await updateCompany(req, res, next);

    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: "Acme", industry: undefined },
    });
    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.message).toBe("Database unavailable");
    expect(databaseError.statusCode).toBeUndefined();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("rejects unexpected fields alongside valid data", async () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await updateCompany({ user: { userId: 10, role: "ADMIN" }, params: { id: "1" }, body: {"name":"Updated name","unexpected":"value"} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: expect.any(String) }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });
});

describe("deleteCompany", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("deletes a company and returns 204", async () => {
    mockPrisma.company.delete.mockResolvedValue({ id: 1 });

    const req = { params: { id: "1" } };
    const res = { status: jest.fn().mockReturnThis(), end: jest.fn() };
    const next = jest.fn();

    await deleteCompany(req, res, next);

    expect(mockPrisma.company.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalledWith();
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards 400 when company ID is not a number", async () => {
    const req = { params: { id: "banana" } };
    const res = { status: jest.fn().mockReturnThis(), end: jest.fn() };
    const next = jest.fn();

    await deleteCompany(req, res, next);

    expect(mockPrisma.company.delete).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Company ID must be a number.",
        statusCode: 400,
      }),
    );
    expect(res.status).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });

  test("forwards 404 when company is not found", async () => {
    const notFoundError = new Error();
    notFoundError.code = "P2025";
    mockPrisma.company.delete.mockRejectedValue(notFoundError);

    const req = { params: { id: "999" } };
    const res = { status: jest.fn().mockReturnThis(), end: jest.fn() };
    const next = jest.fn();

    await deleteCompany(req, res, next);

    expect(mockPrisma.company.delete).toHaveBeenCalledWith({
      where: { id: 999 },
    });
    expect(next).toHaveBeenCalledWith(notFoundError);
    expect(notFoundError.statusCode).toBe(404);
    expect(notFoundError.message).toBe("Company not found.");
    expect(res.status).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });

  test("forwards 409 when company still has contacts", async () => {
    const companyError = new Error();
    companyError.code = "P2003";
    mockPrisma.company.delete.mockRejectedValue(companyError);

    const req = { params: { id: "1" } };
    const res = { status: jest.fn().mockReturnThis(), end: jest.fn() };
    const next = jest.fn();

    await deleteCompany(req, res, next);

    expect(mockPrisma.company.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(next).toHaveBeenCalledWith(companyError);
    expect(companyError.statusCode).toBe(409);
    expect(companyError.message).toBe(
      "Cannot delete a company that still has contacts.",
    );
    expect(res.status).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });

  test("forwards unexpected database errors", async () => {
    const databaseError = new Error("Database unavailable");
    mockPrisma.company.delete.mockRejectedValue(databaseError);

    const req = { params: { id: "1" } };
    const res = { status: jest.fn().mockReturnThis(), end: jest.fn() };
    const next = jest.fn();

    await deleteCompany(req, res, next);

    expect(mockPrisma.company.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(next).toHaveBeenCalledWith(databaseError);
    expect(databaseError.message).toBe("Database unavailable");
    expect(databaseError.statusCode).toBeUndefined();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });
});
