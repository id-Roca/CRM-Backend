import jwt from "jsonwebtoken";
import prisma from "../prisma.js";

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const error = new Error("Authentification required.");
    error.statusCode = 401;
    return next(error);
  }

  const token = authHeader.split(" ")[1];

  const rejectToken = () => {
    const authError = new Error("Invalid or expired token");
    authError.statusCode = 401;
    return next(authError);
  };

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return rejectToken();
  }

  // Tokens issued before tokenVersion was introduced belong to version zero.
  const tokenVersion =
    decoded?.tokenVersion === undefined ? 0 : decoded.tokenVersion;
  if (
    !Number.isSafeInteger(decoded?.userId) ||
    decoded.userId <= 0 ||
    !Number.isSafeInteger(tokenVersion) ||
    tokenVersion < 0
  ) {
    return rejectToken();
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true, tokenVersion: true },
    });
  } catch {
    // Fail closed without passing database details to the public error handler.
    const error = new Error("Authentication temporarily unavailable.");
    error.statusCode = 503;
    return next(error);
  }

  if (!user || user.tokenVersion !== tokenVersion) {
    return rejectToken();
  }

  req.user = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  return next();
};
