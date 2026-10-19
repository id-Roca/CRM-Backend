import { beforeAll, beforeEach, expect, jest, test } from "@jest/globals";
import request from "supertest";

let state, transactionClient, app;
const prisma = { $transaction: jest.fn(), user: { findUnique: jest.fn() } };
jest.unstable_mockModule("../../src/prisma.js", () => ({ default: prisma }));
jest.unstable_mockModule("jsonwebtoken", () => ({
  default: { verify: () => ({ userId: 1, role: "ADMIN", tokenVersion: 0 }) },
}));
beforeAll(async () => { ({ default: app } = await import("../../src/app.js")); });

// A small in-memory transaction fixture: failed callbacks discard their writes.
// This exercises real controllers, validators, helpers and HTTP error handling.
// PostgreSQL's actual serialization behavior is not simulated here.
const matches = (row, where) => Object.entries(where).every(([key, value]) => {
  if (key === "OR") return value.some((condition) => matches(row, condition));
  if (value && typeof value === "object") return row[key] !== value.not;
  return row[key] === value;
});
const applyData = (row, data) => {
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (value && typeof value === "object" && (value.connect || value.disconnect)) {
      row[`${key}Id`] = value.disconnect ? null : value.connect.id;
    } else row[key] = value;
  }
  return { ...row };
};

beforeEach(() => {
  jest.resetAllMocks();
  state = {
    company: [{ id: 1, name: "Company A" }, { id: 2, name: "Company B" }],
    contact: [{ id: 1, name: "Anna", companyId: 1 }, { id: 2, name: "Another", companyId: 1 }, { id: 3, name: "Other company", companyId: 2 }],
    user: [{ id: 1, name: "Admin", email: "admin@example.test", role: "ADMIN", tokenVersion: 0 }],
    offer: [{ id: 1, companyId: 1, contactId: 1, salesUserId: 1, status: "ACCEPTED", description: "Original work", amount: 100 }],
    invoice: [{ id: 1, companyId: 1, contactId: 1, offerId: null, salesUserId: 1, companyName: "Company A", contactName: "Anna", amount: 100 }],
    ticket: [],
  };
  prisma.user.findUnique.mockImplementation(async () => state.user[0]);
  prisma.$transaction.mockImplementation(async (operation) => {
    const draft = structuredClone(state);
    transactionClient = {};
    for (const model of Object.keys(draft)) {
      transactionClient[model] = {
        findFirst: jest.fn(async ({ where }) => draft[model].find(row => matches(row, where)) ?? null),
        findUnique: jest.fn(async ({ where, include }) => {
          const row = draft[model].find(row => matches(row, where));
          if (!row) return null;
          const result = { ...row };
          for (const relation of Object.keys(include ?? {})) {
            const target = relation === "salesUser" ? "user" : relation;
            result[relation] = draft[target].find(item => item.id === row[`${relation}Id`]) ?? null;
          }
          return result;
        }),
        update: jest.fn(async ({ where, data }) => {
          const row = draft[model].find(row => matches(row, where));
          if (!row) throw Object.assign(new Error("Not found"), { code: "P2025" });
          return applyData(row, data);
        }),
        create: jest.fn(async ({ data }) => {
          const row = applyData({ id: draft[model].length + 1, contactId: null }, data);
          draft[model].push(row);
          return { ...row };
        }),
      };
    }
    const result = await operation(transactionClient);
    state = draft;
    return result;
  });
});
const patch = (resource, data) => request(app).patch(`/api/${resource}/1`)
  .set("Authorization", "Bearer fixture-token").send(data);
const post = (resource, data) => request(app).post(`/api/${resource}`)
  .set("Authorization", "Bearer fixture-token").send(data);
const ticket = (data = {}) => ({ id: 1, companyId: 1, contactId: 1, ...data });

test.each(["ticket", "offer", "invoice"])("contact move conflicts with a linked %s and leaves all records unchanged", async (model) => {
  state.offer = [];
  state.invoice = [];
  state[model] = [{ id: 1, companyId: 1, contactId: 1 }];
  const before = structuredClone(state);
  const response = await patch("contacts", { companyId: 2, name: "Must not change" }).expect(409);
  expect(response.body.message).toContain(`linked ${model}`);
  expect(state).toEqual(before);
  expect(transactionClient.contact.update).not.toHaveBeenCalled();
});

test("unlinked contact may move; linked contact may keep company and change other fields", async () => {
  await patch("contacts", { companyId: 1, name: "Updated Name" }).expect(200);
  state.offer = [];
  state.invoice = [];
  await patch("contacts", { companyId: 2 }).expect(200);
  expect(state.contact[0]).toMatchObject({ companyId: 2, name: "Updated Name" });
});

test.each(["offer", "invoice"])("%s rejects company and contact changes incompatible with tickets", async (model) => {
  state.ticket = [ticket({ [`${model}Id`]: 1 })];
  const before = structuredClone(state);
  for (const data of [{ companyId: 2, contactId: 3 }, { contactId: 2 }, { companyId: 2, contactId: null }]) {
    const response = await patch(`${model}s`, { ...data, amount: 999 }).expect(409);
    expect(response.body.message).toContain("linked ticket");
    expect(state).toEqual(before);
    expect(transactionClient[model].update).not.toHaveBeenCalled();
  }
});

test.each(["offer", "invoice"])("%s allows unrelated edits, unchanged relationships and removal of optional contact", async (model) => {
  state.ticket = [ticket({ [`${model}Id`]: 1 })];
  await patch(`${model}s`, { amount: 200 }).expect(200);
  await patch(`${model}s`, { companyId: 1, contactId: 1 }).expect(200);
  await patch(`${model}s`, { contactId: null }).expect(200);
  expect(state[model][0]).toMatchObject({ companyId: 1, contactId: null, amount: 200 });
  expect(state.ticket[0].contactId).toBe(1);
});

test.each(["offer", "invoice"])("%s with null contact may choose a contact only if every linked ticket matches", async (model) => {
  state[model][0].contactId = null;
  state.ticket = [ticket({ [`${model}Id`]: 1 }), ticket({ id: 2, contactId: 2, [`${model}Id`]: 1 })];
  await patch(`${model}s`, { contactId: 1 }).expect(409);
  expect(state[model][0].contactId).toBeNull();
  state.ticket.pop();
  await patch(`${model}s`, { contactId: 1 }).expect(200);
});

test.each(["offer", "invoice"])("unlinked %s may change company/contact but still validates its own contact", async (model) => {
  await patch(`${model}s`, { companyId: 2 }).expect(400);
  expect(state[model][0].companyId).toBe(1);
  await patch(`${model}s`, { companyId: 2, contactId: 3 }).expect(200);
  expect(state[model][0]).toMatchObject({ companyId: 2, contactId: 3 });
  await patch(`${model}s`, { companyId: 1, contactId: null }).expect(200);
});

test("invoice from an offer copies coherent relationships and remains an independent snapshot", async () => {
  const response = await post("invoices", { offerId: 1 }).expect(201);
  expect(response.body).toMatchObject({ offerId: 1, companyId: 1, contactId: 1, companyName: "Company A", contactName: "Anna" });
  const invoice = structuredClone(state.invoice[1]);
  await patch("offers", { companyId: 2, contactId: 3 }).expect(200);
  expect(state.invoice[1]).toEqual(invoice);
  // Historical source links do not require ongoing equality of editable fields.
  state.invoice[0].offerId = 1;
  await patch("invoices", { companyId: 2, contactId: 3 }).expect(200);
  expect(state.invoice[0].offerId).toBe(1);
  await patch("contacts", { companyId: 2 }).expect(409);
});

test("invoice from an offer without a contact keeps the optional relationship null", async () => {
  state.offer[0].contactId = null;
  const response = await post("invoices", { offerId: 1 }).expect(201);
  expect(response.body).toMatchObject({ offerId: 1, companyId: 1, contactId: null, contactName: null });
});

test("all relationship creators and ticket linking use the serializable transaction client", async () => {
  await post("offers", { description: "New offer", amount: 100, companyId: 1, contactId: 1 }).expect(201);
  await post("invoices", { description: "New invoice", amount: 100, companyId: 1, contactId: 1 }).expect(201);
  await post("tickets", { subject: "Help needed", description: "Please help", companyId: 1, contactId: 1, offerId: 1, invoiceId: 1 }).expect(201);
  await patch("tickets", { offerId: 2, invoiceId: 2, assignedUserId: 1 }).expect(200);
  await patch("tickets", { offerId: null, invoiceId: null }).expect(200);
  expect(state.ticket[0]).toMatchObject({ companyId: 1, contactId: 1, offerId: null, invoiceId: null });
  expect(prisma.$transaction).toHaveBeenCalledTimes(5);
  for (const [, options] of prisma.$transaction.mock.calls) {
    expect(options).toEqual({ isolationLevel: "Serializable" });
  }
});
