import { beforeAll, beforeEach, afterEach, expect, jest, test } from '@jest/globals';
const mockJwt = { verify: jest.fn() };
const mockPrisma = { user: { findUnique: jest.fn() } };
jest.unstable_mockModule('jsonwebtoken', () => ({ default: mockJwt }));
jest.unstable_mockModule('../../../src/prisma.js', () => ({ default: mockPrisma }));
let authenticateToken;
beforeAll(async () => {
  ({ authenticateToken } = await import('../../../src/middleware/authMiddleware.js'));
});
beforeEach(() => {
  jest.resetAllMocks();
  jest.replaceProperty(process, 'env', { ...process.env, JWT_SECRET: 'dummy-test-secret' });
});
afterEach(() => jest.restoreAllMocks());

const run = async (authorization = 'Bearer dummy-token') => {
  const req = { headers: { authorization } };
  const next = jest.fn();
  await authenticateToken(req, {}, next);
  return { req, next };
};

test('loads current database identity, never trusting JWT role or profile', async () => {
  mockJwt.verify.mockReturnValue({ userId: 1, role: 'ADMIN', name: 'Old', tokenVersion: 2 });
  mockPrisma.user.findUnique.mockResolvedValue({ id: 1, role: 'SALES', name: 'Current', email: 'current@example.test', tokenVersion: 2 });
  const { req, next } = await run();
  expect(mockJwt.verify).toHaveBeenCalledWith('dummy-token', 'dummy-test-secret');
  expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, select: { id: true, name: true, email: true, role: true, tokenVersion: true } });
  expect(req.user).toEqual({ userId: 1, role: 'SALES', name: 'Current', email: 'current@example.test' });
  expect(next).toHaveBeenCalledTimes(1);
  expect(next).toHaveBeenCalledWith();
});

test.each([undefined, 'Basic dummy-token'])('rejects missing/non-Bearer header %s', async (header) => {
  const req = { headers: { authorization: header } };
  const next = jest.fn();
  await authenticateToken(req, {}, next);
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  expect(mockJwt.verify).not.toHaveBeenCalled();
  expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
});

test.each([null, 'payload', {}, { userId: -1 }, { userId: '1' }, { userId: 1, tokenVersion: null }, { userId: 1, tokenVersion: -1 }, { userId: 1, tokenVersion: '0' }])('rejects malformed signed claims %j', async (claims) => {
  mockJwt.verify.mockReturnValue(claims);
  const { req, next } = await run();
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  expect(req.user).toBeUndefined();
  expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
});

test('fails closed with a safe message on database failure', async () => {
  mockJwt.verify.mockReturnValue({ userId: 1 });
  mockPrisma.user.findUnique.mockRejectedValue(new Error('secret database credentials'));
  const { req, next } = await run();
  expect(req.user).toBeUndefined();
  expect(next).toHaveBeenCalledTimes(1);
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503, message: 'Authentication temporarily unavailable.' }));
});
