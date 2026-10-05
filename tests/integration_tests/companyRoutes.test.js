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
  company: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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
  jest.clearAllMocks();
});

describe("GET /api/companies", () => {

  test("returns companies for an authenticated sales user", async () => {
    const fakeCompanies = [
      {
        id: 1,
        name: "Acme Corp",
        industry: "Technology",
      },
    ];

    mockJwt.verify.mockReturnValue({
      userId: 1,
      role: "SALES",
    });

    mockPrisma.company.findMany.mockResolvedValue(fakeCompanies);

    const response = await request(app)
      .get("/api/companies")
      .set("Authorization", "Bearer dummy-tocken")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(fakeCompanies);

    expect(mockPrisma.company.findMany).toHaveBeenCalledWith({
      orderBy: {
        id: "asc",
      },
    });
  });

  test("returns 401 when no authentication token is provided", async () => {
    const response = await request(app)
      .get("/api/companies")
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Authentification required.",
    });
    expect(mockJwt.verify).not.toHaveBeenCalled();
    expect(mockPrisma.company.findMany).not.toHaveBeenCalled();
  });

  test("returns 401 when the token is invalid or expired", async () => {
    mockJwt.verify.mockImplementation(() => {
      throw new Error("jwt expired");
    });

    const response = await request(app)
      .get("/api/companies")
      .set("Authorization", "Bearer invalid-token")
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Invalid or expired token",
    });
  });

  test("returns 500 when the database query fails", async () => {
    mockJwt.verify.mockReturnValue({
      userId: 1,
      role: "SALES",
    });

    mockPrisma.company.findMany.mockRejectedValue(
      new Error("Database connection failed"),
    );

    const response = await request(app)
      .get("/api/companies")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Database connection failed",
    });
  });
});

describe("GET /api/companies/:id", () => {
  test("returns 400 when the input/URL is invalid", async () => {
    mockJwt.verify.mockReturnValue({
      userId: 1,
      role: "SALES",
    });

    const response = await request(app)
      .get("/api/companies/banana")
      .set("Authorization", "Bearer dummy-tocken")
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Company ID must be a number.",
    });
    expect(mockPrisma.company.findUnique).not.toHaveBeenCalled();
  });

  test("returns 404 when the company does not exist", async () => {
    mockJwt.verify.mockReturnValue({
      userId: 1,
      role: "SALES",
    });

    mockPrisma.company.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .get("/api/companies/999")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toEqual({
      success: false,
      message: "Company not found.",
    });
    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({
      where: { id: 999 },
    });
  });

  test("returns one company for an authenticated support user", async () => {
    mockJwt.verify.mockReturnValue({ userId: 1, role: "SUPPORT" });
    const company = { id: 1, name: "Acme Corp", industry: "Technology" };
    mockPrisma.company.findUnique.mockResolvedValue(company);

    const response = await request(app)
      .get("/api/companies/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(company);
    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  test("returns 500 when looking up a company fails", async () => {
    mockJwt.verify.mockReturnValue({ userId: 1, role: "ADMIN" });
    mockPrisma.company.findUnique.mockRejectedValue(new Error("Database connection failed"));

    const response = await request(app)
      .get("/api/companies/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Database connection failed",
    });
  });
});

describe("POST /api/companies", () => {
  test("creates a new company and returns 201", async () => {
    mockJwt.verify.mockReturnValue({
      userId: 1,
      role: "SALES",
    });

    const newCompany = {
      id: 1,
      name: "Acme Corp",
      industry: "Technology",
    };

    mockPrisma.company.create.mockResolvedValue(newCompany);

    const response = await request(app)
      .post("/api/companies")
      .set("Authorization", "Bearer dummy-token")
      .send({
        name: "Acme Corp",
        industry: "Technology",
      })
      .expect("Content-Type", /json/)
      .expect(201);

    expect(response.body).toEqual(newCompany);

    expect(mockPrisma.company.create).toHaveBeenCalledWith({
      data: {
        name: "Acme Corp",
        industry: "Technology",
      },
    });
  });

  test("returns 400 when company data is invalid", async () => {
    mockJwt.verify.mockReturnValue({
      userId: 1,
      role: "SALES",
    });

    const response = await request(app)
      .post("/api/companies")
      .set("Authorization", "Bearer dummy-token")
      .send({
        name: "A",
        industry: "Technology",
      })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Name must be at least 3 characters.",
    });

    expect(mockPrisma.company.create).not.toHaveBeenCalled();
  });

  test("returns 409 when company name already exists", async () => {
    mockJwt.verify.mockReturnValue({
      userId: 1,
      role: "SALES",
    });

    const duplicateError = new Error("Unique constraint failed");
    duplicateError.code = "P2002";

    mockPrisma.company.create.mockRejectedValue(duplicateError);

    const response = await request(app)
      .post("/api/companies")
      .set("Authorization", "Bearer dummy-token")
      .send({
        name: "Acme Corp",
        industry: "Technology",
      })
      .expect("Content-Type", /json/)
      .expect(409);

    expect(response.body).toEqual({
      success: false,
      message: "A company with this name already exists.",
    });
  });

  test("returns 401 when no authentication token is provided", async () => {
    const response = await request(app)
      .post("/api/companies")
      .send({
        name: "Acme Corp",
        industry: "Technology",
      })
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Authentification required.",
    });

    expect(mockPrisma.company.create).not.toHaveBeenCalled();
  });

  test("returns 401 when the token is invalid or expired", async () => {
    mockJwt.verify.mockImplementation(() => {
      throw new Error("jwt expired");
    });

    const response = await request(app)
      .post("/api/companies")
      .set("Authorization", "Bearer invalid-token")
      .send({
        name: "Acme Corp",
        industry: "Technology",
      })
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Invalid or expired token",
    });

    expect(mockPrisma.company.create).not.toHaveBeenCalled();
  });

  test("returns 500 when creating the company unexpectedly fails", async () => {
    mockJwt.verify.mockReturnValue({
      userId: 1,
      role: "SALES",
    });

    mockPrisma.company.create.mockRejectedValue(
      new Error("Database connection failed"),
    );

    const response = await request(app)
      .post("/api/companies")
      .set("Authorization", "Bearer dummy-token")
      .send({
        name: "Acme Corp",
        industry: "Technology",
      })
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Database connection failed",
    });
  });
});

describe("PATCH /api/companies/:id", () => {
  test("updates a company for an authenticated support user", async () => {
    mockJwt.verify.mockReturnValue({ userId: 1, role: "SUPPORT" });
    const company = { id: 1, name: "Updated Corp", industry: "Technology" };
    mockPrisma.company.update.mockResolvedValue(company);

    const response = await request(app)
      .patch("/api/companies/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Updated Corp" })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(company);
    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: "Updated Corp", industry: undefined },
    });
  });

  test("returns 400 when no update fields are provided", async () => {
    mockJwt.verify.mockReturnValue({ userId: 1, role: "SALES" });

    const response = await request(app)
      .patch("/api/companies/1")
      .set("Authorization", "Bearer dummy-token")
      .send({})
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "At least one field is required.",
    });
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });

  test("returns 400 when an update field is invalid", async () => {
    mockJwt.verify.mockReturnValue({ userId: 1, role: "SALES" });

    const response = await request(app)
      .patch("/api/companies/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ industry: "IT" })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Industry must be at least 3 characters.",
    });
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });

  test("returns 400 when the company ID is not positive", async () => {
    mockJwt.verify.mockReturnValue({ userId: 1, role: "SALES" });

    const response = await request(app)
      .patch("/api/companies/0")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Updated Corp" })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Company ID must be a positive number.",
    });
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });

  test("returns 401 when no authentication token is provided", async () => {
    const response = await request(app)
      .patch("/api/companies/1")
      .send({ name: "Updated Corp" })
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Authentification required.",
    });
    expect(mockJwt.verify).not.toHaveBeenCalled();
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });

  test("returns 404 when the company to update does not exist", async () => {
    mockJwt.verify.mockReturnValue({ userId: 1, role: "SALES" });
    const notFoundError = new Error();
    notFoundError.code = "P2025";
    mockPrisma.company.update.mockRejectedValue(notFoundError);

    const response = await request(app)
      .patch("/api/companies/999")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Updated Corp" })
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toEqual({
      success: false,
      message: "No record was found for an update.",
    });
    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: 999 },
      data: { name: "Updated Corp", industry: undefined },
    });
  });

  test("returns 409 when the updated company name already exists", async () => {
    mockJwt.verify.mockReturnValue({ userId: 1, role: "SALES" });
    const duplicateError = new Error();
    duplicateError.code = "P2002";
    mockPrisma.company.update.mockRejectedValue(duplicateError);

    const response = await request(app)
      .patch("/api/companies/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Acme Corp" })
      .expect("Content-Type", /json/)
      .expect(409);

    expect(response.body).toEqual({
      success: false,
      message: "A company with this name already exists.",
    });
  });

  test("returns 500 when updating a company unexpectedly fails", async () => {
    mockJwt.verify.mockReturnValue({ userId: 1, role: "SALES" });
    mockPrisma.company.update.mockRejectedValue(new Error("Database connection failed"));

    const response = await request(app)
      .patch("/api/companies/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Updated Corp" })
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Database connection failed",
    });
  });
});

describe("DELETE /api/companies/:id", () => {
  test("returns 403 when the role is unautorized", async () => {
    mockJwt.verify.mockReturnValue({
      userId: 1,
      role: "SALES",
    });

    const response = await request(app)
      .delete("/api/companies/1")
      .set("Authorization", "Bearer dummy-tocken")
      .expect("Content-Type", /json/)
      .expect(403);

    expect(response.body).toEqual({ success: false, message: "Forbidden" });
    expect(mockPrisma.company.delete).not.toHaveBeenCalled();
  });

  test("returns 403 for a support user", async () => {
    mockJwt.verify.mockReturnValue({ userId: 1, role: "SUPPORT" });

    const response = await request(app)
      .delete("/api/companies/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(403);

    expect(response.body).toEqual({ success: false, message: "Forbidden" });
    expect(mockPrisma.company.delete).not.toHaveBeenCalled();
  });

  test("deletes a company for an admin and returns an empty 204 response", async () => {
    mockJwt.verify.mockReturnValue({ userId: 1, role: "ADMIN" });
    mockPrisma.company.delete.mockResolvedValue({ id: 1 });

    const response = await request(app)
      .delete("/api/companies/1")
      .set("Authorization", "Bearer dummy-token")
      .expect(204);

    expect(response.text).toBe("");
    expect(mockPrisma.company.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  test("returns 401 when no authentication token is provided", async () => {
    const response = await request(app)
      .delete("/api/companies/1")
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Authentification required.",
    });
    expect(mockJwt.verify).not.toHaveBeenCalled();
    expect(mockPrisma.company.delete).not.toHaveBeenCalled();
  });

  test("returns 400 when the company ID is invalid", async () => {
    mockJwt.verify.mockReturnValue({ userId: 1, role: "ADMIN" });

    const response = await request(app)
      .delete("/api/companies/banana")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Company ID must be a number.",
    });
    expect(mockPrisma.company.delete).not.toHaveBeenCalled();
  });

  test("returns 404 when the company to delete does not exist", async () => {
    mockJwt.verify.mockReturnValue({ userId: 1, role: "ADMIN" });
    const notFoundError = new Error();
    notFoundError.code = "P2025";
    mockPrisma.company.delete.mockRejectedValue(notFoundError);

    const response = await request(app)
      .delete("/api/companies/999")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toEqual({ success: false, message: "Company not found." });
    expect(mockPrisma.company.delete).toHaveBeenCalledWith({ where: { id: 999 } });
  });

  test("returns 409 when the company still has contacts", async () => {
    mockJwt.verify.mockReturnValue({ userId: 1, role: "ADMIN" });
    const companyError = new Error();
    companyError.code = "P2003";
    mockPrisma.company.delete.mockRejectedValue(companyError);

    const response = await request(app)
      .delete("/api/companies/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(409);

    expect(response.body).toEqual({
      success: false,
      message: "Cannot delete a company that still has contacts.",
    });
  });

  test("returns 500 when deleting a company unexpectedly fails", async () => {
    mockJwt.verify.mockReturnValue({ userId: 1, role: "ADMIN" });
    mockPrisma.company.delete.mockRejectedValue(new Error("Database connection failed"));

    const response = await request(app)
      .delete("/api/companies/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Database connection failed",
    });
  });
});
