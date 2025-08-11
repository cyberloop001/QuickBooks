import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  logger.error("Unhandled error", {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    },
  });

  // Determine status code
  const statusCode = error.statusCode || 500;

  // Determine if this is an operational error
  const isOperational = error.isOperational !== false;

  // Don't leak error details in production for non-operational errors
  const message =
    isOperational || process.env.NODE_ENV === "development"
      ? error.message
      : "Internal server error";

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      ...(process.env.NODE_ENV === "development" && {
        stack: error.stack,
        name: error.name,
      }),
    },
  });
}

// Helper function to create operational errors
export function createOperationalError(
  message: string,
  statusCode: number = 500
): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}

// Helper function to create validation errors
export function createValidationError(message: string): AppError {
  return createOperationalError(message, 400);
}

// Helper function to create authentication errors
export function createAuthError(message: string): AppError {
  return createOperationalError(message, 401);
}

// Helper function to create authorization errors
export function createForbiddenError(message: string): AppError {
  return createOperationalError(message, 403);
}

// Helper function to create not found errors
export function createNotFoundError(message: string): AppError {
  return createOperationalError(message, 404);
}

// Helper function to create conflict errors
export function createConflictError(message: string): AppError {
  return createOperationalError(message, 409);
}

// Helper function to create rate limit errors
export function createRateLimitError(message: string): AppError {
  return createOperationalError(message, 429);
}
