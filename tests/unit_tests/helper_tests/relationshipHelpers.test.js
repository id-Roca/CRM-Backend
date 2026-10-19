import { beforeAll, beforeEach, expect, jest, test } from "@jest/globals";
const prisma = { $transaction: jest.fn() };
jest.unstable_mockModule("../../../src/prisma.js", () => ({ default: prisma }));
let withRelationshipTransaction;
beforeAll(async () => {
  ({ withRelationshipTransaction } = await import("../../../src/helpers/relationshipHelpers.js"));
});
beforeEach(() => jest.resetAllMocks());

test("retries serialization conflicts with a fresh transaction and returns only committed data", async () => {
  const clients = [{ attempt: 1 }, { attempt: 2 }];
  const operation = jest.fn(async (db) => db.attempt);
  prisma.$transaction.mockImplementationOnce(async (callback) => {
    await callback(clients[0]);
    throw Object.assign(new Error("conflict"), { code: "P2034" });
  }).mockImplementationOnce(async (callback) => callback(clients[1]));
  await expect(withRelationshipTransaction(operation)).resolves.toBe(2);
  expect(operation.mock.calls).toEqual([[clients[0]], [clients[1]]]);
  expect(prisma.$transaction).toHaveBeenCalledWith(operation, { isolationLevel: "Serializable" });
});

test("returns safe 409 after bounded serialization retries", async () => {
  prisma.$transaction.mockRejectedValue(Object.assign(new Error("internal details"), { code: "P2034" }));
  await expect(withRelationshipTransaction(jest.fn())).rejects.toMatchObject({
    statusCode: 409,
    message: "Related records changed concurrently. Please retry the request.",
  });
  expect(prisma.$transaction).toHaveBeenCalledTimes(3);
});

test("does not retry business conflicts or unrelated database errors", async () => {
  const error = Object.assign(new Error("Linked ticket conflict"), { statusCode: 409 });
  prisma.$transaction.mockRejectedValue(error);
  await expect(withRelationshipTransaction(jest.fn())).rejects.toBe(error);
  expect(prisma.$transaction).toHaveBeenCalledTimes(1);
});

test("retry rechecks links and rejects a conflict that appeared during the first attempt", async () => {
  const { assertContactCompanyChange } = await import("../../../src/helpers/relationshipHelpers.js");
  const db = {
    ticket: { findFirst: jest.fn().mockResolvedValue(null) },
    offer: { findFirst: jest.fn().mockResolvedValue(null) },
    invoice: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  const operation = jest.fn(async (tx) => assertContactCompanyChange(tx, 1, 2));
  prisma.$transaction.mockImplementationOnce(async (callback) => {
    await callback(db);
    db.ticket.findFirst.mockResolvedValue({ id: 1 });
    throw Object.assign(new Error("serialization conflict"), { code: "P2034" });
  }).mockImplementationOnce(async (callback) => callback(db));
  await expect(withRelationshipTransaction(operation)).rejects.toMatchObject({
    statusCode: 409,
    message: "Cannot change contact company: a linked ticket belongs to another company.",
  });
  expect(operation).toHaveBeenCalledTimes(2);
  expect(db.ticket.findFirst).toHaveBeenCalledWith({
    where: { contactId: 1, companyId: { not: 2 } },
    select: { id: true },
  });
});
