import { NextFunction, Request, Response } from "express";

export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const globalErrorHandler = (
  err: Error & { statusCode?: number; code?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error("Server Error:", err);

  if (err.code === 11000) {
    res.status(409).json({
      success: false,
      message: "Duplicate record: email or unique field already exists.",
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error.",
  });
};