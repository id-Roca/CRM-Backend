export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
};

export const errorHandler = (err, req, res, next) => {
  // Detailed error showed in the terminal for testing
  console.error(err);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    // Clean response for the client
    message: err.message || "Internal Server Error",
  });
};
