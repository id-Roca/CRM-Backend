import { relationshipPrisma } from "./relationshipPrisma.js";
// Existing route tests model an active user matching their JWT fixture.
// Keep authentication reads separate from controller-query mock queues.
// Independent database roles and revocation are tested in authLifecycle.test.js.
export const authenticatedPrisma = (prisma, jwt) => relationshipPrisma({
  ...prisma,
  user: {
    ...prisma.user,
    findUnique: (query) => {
      if (query.select?.tokenVersion) {
        const claims = jwt.verify.mock.results.at(-1)?.value;
        return Promise.resolve({
          id: claims.userId,
          role: claims.role,
          tokenVersion: 0,
          name: 'Authenticated User',
          email: 'authenticated@example.test',
        });
      }
      return prisma.user.findUnique(query);
    },
  },
});
