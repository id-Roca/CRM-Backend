// Older controller/route fixtures have no conflicting linked records.
// Dedicated relationship tests supply explicit transaction clients and conflicts.
export const relationshipPrisma = (prisma) => {
  const db = { ...prisma };
  for (const model of ["ticket", "offer", "invoice"]) {
    db[model] = { findFirst: async () => null, ...prisma[model] };
  }
  db.$transaction = async (operation) => operation(db);
  return db;
};
