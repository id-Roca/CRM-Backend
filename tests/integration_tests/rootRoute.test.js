import { expect, jest, test } from "@jest/globals";
import request from "supertest";

jest.unstable_mockModule("../../src/prisma.js", () => ({ default: {} }));
const { default: app } = await import("../../src/app.js");

test("GET / returns the welcome JSON without authentication", async () => {
  const response = await request(app)
    .get("/")
    .expect("Content-Type", /json/)
    .expect(200);

  expect(response.body).toEqual({
    success: true,
    message: "Welcome to the CRM Backend API!",
    description:
      "A RESTful CRM API with JWT authentication, role-based access control, and PostgreSQL.",
    documentation: "https://github.com/id-Roca/CRM-Backend",
    status: "running",
  });
});
