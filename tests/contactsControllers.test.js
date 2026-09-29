import { beforeAll, expect, jest, describe, test } from "@jest/globals";

const mockPrisma = {
  contact: {
    findMany: jest.fn(),
  },
};

jest.unstable_mockModule("../src/prisma.js", () => ({
  default: mockPrisma,
}));

beforeAll(async () => {
  ({ getAllContacts, getContactsById, createNewContact, updateContact } =
    await import("../src/contactsControllers/contactsControllers.js"));
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
