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
  contact: {
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

describe("GET /api/contacts", () => {
  test("returns contacts for an authenticated sales user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    const contacts = [{ id: 1, name: "Anna", email: "anna@example.test", companyId: 1 }];
    mockPrisma.contact.findMany.mockResolvedValueOnce(contacts);

    const response = await request(app)
      .get("/api/contacts")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(contacts);
    expect(mockPrisma.contact.findMany).toHaveBeenCalledWith({ orderBy: { id: "asc" } });
  });

  test("returns 401 when no authentication token is provided", async () => {

    const response = await request(app)
      .get("/api/contacts")
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Authentification required.",
    });
    expect(mockJwt.verify).not.toHaveBeenCalled();
    expect(mockPrisma.contact.findMany).not.toHaveBeenCalled();
  });

  test("returns 401 when the token is invalid or expired", async () => {
    mockJwt.verify.mockImplementationOnce(() => {
      throw new Error("jwt expired");
    });

    const response = await request(app)
      .get("/api/contacts")
      .set("Authorization", "Bearer invalid-token")
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Invalid or expired token",
    });
    expect(mockPrisma.contact.findMany).not.toHaveBeenCalled();
  });

  test("returns 500 when listing contacts fails", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    mockPrisma.contact.findMany.mockRejectedValueOnce(new Error("Database connection failed"));

    const response = await request(app)
      .get("/api/contacts")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Database connection failed",
    });
  });
});

describe("GET /api/contacts/:id", () => {
  test("returns one contact for an authenticated support user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SUPPORT" });
    const contact = { id: 1, name: "Anna", email: "anna@example.test", companyId: 1 };
    mockPrisma.contact.findUnique.mockResolvedValueOnce(contact);

    const response = await request(app)
      .get("/api/contacts/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(contact);
    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  test("returns 400 when the contact ID is invalid", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });

    const response = await request(app)
      .get("/api/contacts/banana")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Contact ID must be a number.",
    });
    expect(mockPrisma.contact.findUnique).not.toHaveBeenCalled();
  });

  test("returns 404 when the contact does not exist", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    mockPrisma.contact.findUnique.mockResolvedValueOnce(null);

    const response = await request(app)
      .get("/api/contacts/999")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toEqual({
      success: false,
      message: "Contact not found.",
    });
    expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({ where: { id: 999 } });
  });

  test("returns 500 when looking up a contact fails", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    mockPrisma.contact.findUnique.mockRejectedValueOnce(new Error("Database connection failed"));

    const response = await request(app)
      .get("/api/contacts/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Database connection failed",
    });
  });
});

describe("POST /api/contacts", () => {
  test("creates a contact and returns 201", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    const contact = { id: 1, name: "Anna", email: "anna@example.test", companyId: 1 };
    mockPrisma.contact.create.mockResolvedValueOnce(contact);

    const response = await request(app)
      .post("/api/contacts")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Anna", email: "anna@example.test", companyId: 1 })
      .expect("Content-Type", /json/)
      .expect(201);

    expect(response.body).toEqual(contact);
    expect(mockPrisma.contact.create).toHaveBeenCalledWith({ data: { name: "Anna", email: "anna@example.test", companyId: 1 } });
  });

  test("returns 400 when the email is invalid", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });

    const response = await request(app)
      .post("/api/contacts")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Anna", email: "not-an-email", companyId: 1 })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Invalid email address.",
    });
    expect(mockPrisma.contact.create).not.toHaveBeenCalled();
  });

  test("returns 409 when the contact email already exists", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    const prismaError = new Error("Database request failed");
    prismaError.code = "P2002";
    mockPrisma.contact.create.mockRejectedValueOnce(prismaError);

    const response = await request(app)
      .post("/api/contacts")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Anna", email: "anna@example.test", companyId: 1 })
      .expect("Content-Type", /json/)
      .expect(409);

    expect(response.body).toEqual({
      success: false,
      message: "A contact with this email already exists.",
    });
  });

  test("returns 400 when the company does not exist", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    const prismaError = new Error("Database request failed");
    prismaError.code = "P2003";
    mockPrisma.contact.create.mockRejectedValueOnce(prismaError);

    const response = await request(app)
      .post("/api/contacts")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Anna", email: "anna@example.test", companyId: 1 })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Company does not exist.",
    });
  });

  test("returns 401 when no authentication token is provided", async () => {

    const response = await request(app)
      .post("/api/contacts")
      .send({ name: "Anna", email: "anna@example.test", companyId: 1 })
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Authentification required.",
    });
    expect(mockJwt.verify).not.toHaveBeenCalled();
    expect(mockPrisma.contact.create).not.toHaveBeenCalled();
  });

  test("returns 500 when creating a contact unexpectedly fails", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    mockPrisma.contact.create.mockRejectedValueOnce(new Error("Database connection failed"));

    const response = await request(app)
      .post("/api/contacts")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Anna", email: "anna@example.test", companyId: 1 })
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Database connection failed",
    });
  });
});

describe("PATCH /api/contacts/:id", () => {
  test("updates contact fields and connects a company for a support user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SUPPORT" });
    const contact = { id: 1, name: "Anna", email: "anna@example.test", companyId: 2 };
    mockPrisma.contact.update.mockResolvedValueOnce(contact);

    const response = await request(app)
      .patch("/api/contacts/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Anna", email: "anna@example.test", companyId: 2 })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(contact);
    expect(mockPrisma.contact.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        name: "Anna",
        email: "anna@example.test",
        company: { connect: { id: 2 } },
      },
    });
  });

  test("updates only the supplied fields", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    const contact = { id: 1, name: "Anna", email: "anna@example.test", companyId: 1 };
    mockPrisma.contact.update.mockResolvedValueOnce(contact);

    const response = await request(app)
      .patch("/api/contacts/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Anna" })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(contact);
    expect(mockPrisma.contact.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: "Anna", email: undefined, company: undefined },
    });
  });

  test("returns 400 when no update fields are provided", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });

    const response = await request(app)
      .patch("/api/contacts/1")
      .set("Authorization", "Bearer dummy-token")
      .send({})
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "At least one field is required.",
    });
    expect(mockPrisma.contact.update).not.toHaveBeenCalled();
  });

  test("returns 400 when the email is invalid", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });

    const response = await request(app)
      .patch("/api/contacts/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ email: "not-an-email" })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Invalid email address",
    });
    expect(mockPrisma.contact.update).not.toHaveBeenCalled();
  });

  test("returns 400 when the contact ID is not positive", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });

    const response = await request(app)
      .patch("/api/contacts/0")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Anna" })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Contact ID must be a positive number.",
    });
    expect(mockPrisma.contact.update).not.toHaveBeenCalled();
  });

  test("returns 401 when no authentication token is provided", async () => {

    const response = await request(app)
      .patch("/api/contacts/1")
      .send({ name: "Anna" })
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Authentification required.",
    });
    expect(mockJwt.verify).not.toHaveBeenCalled();
    expect(mockPrisma.contact.update).not.toHaveBeenCalled();
  });

  test("returns 404 when the contact to update does not exist", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    const prismaError = new Error("Database request failed");
    prismaError.code = "P2025";
    mockPrisma.contact.update.mockRejectedValueOnce(prismaError);

    const response = await request(app)
      .patch("/api/contacts/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Anna" })
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toEqual({
      success: false,
      message: "No record was found for an update.",
    });
  });

  test("returns 409 when the updated email already exists", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    const prismaError = new Error("Database request failed");
    prismaError.code = "P2002";
    mockPrisma.contact.update.mockRejectedValueOnce(prismaError);

    const response = await request(app)
      .patch("/api/contacts/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ email: "anna@example.test" })
      .expect("Content-Type", /json/)
      .expect(409);

    expect(response.body).toEqual({
      success: false,
      message: "A contact with this email already exists.",
    });
  });

  test("returns 400 when the company does not exist", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    const prismaError = new Error("Database request failed");
    prismaError.code = "P2003";
    mockPrisma.contact.update.mockRejectedValueOnce(prismaError);

    const response = await request(app)
      .patch("/api/contacts/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ companyId: 999 })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Company does not exist.",
    });
    expect(mockPrisma.contact.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        name: undefined,
        email: undefined,
        company: { connect: { id: 999 } },
      },
    });
  });

  test("returns 500 when updating a contact unexpectedly fails", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });
    mockPrisma.contact.update.mockRejectedValueOnce(new Error("Database connection failed"));

    const response = await request(app)
      .patch("/api/contacts/1")
      .set("Authorization", "Bearer dummy-token")
      .send({ name: "Anna" })
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Database connection failed",
    });
  });
});

describe("DELETE /api/contacts/:id", () => {
  test("deletes a contact for an admin and returns an empty 204 response", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    mockPrisma.contact.delete.mockResolvedValueOnce({ id: 1 });

    const response = await request(app)
      .delete("/api/contacts/1")
      .set("Authorization", "Bearer dummy-token")
      .expect(204);

    expect(response.text).toBe("");
    expect(mockPrisma.contact.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  test("returns 403 for a sales user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SALES" });

    const response = await request(app)
      .delete("/api/contacts/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "Forbidden",
    });
    expect(mockPrisma.contact.delete).not.toHaveBeenCalled();
  });

  test("returns 403 for a support user", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "SUPPORT" });

    const response = await request(app)
      .delete("/api/contacts/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "Forbidden",
    });
    expect(mockPrisma.contact.delete).not.toHaveBeenCalled();
  });

  test("returns 401 when no authentication token is provided", async () => {

    const response = await request(app)
      .delete("/api/contacts/1")
      .expect("Content-Type", /json/)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Authentification required.",
    });
    expect(mockJwt.verify).not.toHaveBeenCalled();
    expect(mockPrisma.contact.delete).not.toHaveBeenCalled();
  });

  test("returns 400 when the contact ID is invalid", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });

    const response = await request(app)
      .delete("/api/contacts/banana")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Contact ID must be a number.",
    });
    expect(mockPrisma.contact.delete).not.toHaveBeenCalled();
  });

  test("returns 404 when the contact to delete does not exist", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    const prismaError = new Error("Database request failed");
    prismaError.code = "P2025";
    mockPrisma.contact.delete.mockRejectedValueOnce(prismaError);

    const response = await request(app)
      .delete("/api/contacts/999")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toEqual({
      success: false,
      message: "Contact not found.",
    });
    expect(mockPrisma.contact.delete).toHaveBeenCalledWith({ where: { id: 999 } });
  });

  test("returns 500 when deleting a contact unexpectedly fails", async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 1, role: "ADMIN" });
    mockPrisma.contact.delete.mockRejectedValueOnce(new Error("Database connection failed"));

    const response = await request(app)
      .delete("/api/contacts/1")
      .set("Authorization", "Bearer dummy-token")
      .expect("Content-Type", /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Database connection failed",
    });
  });
});
