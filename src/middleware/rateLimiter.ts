import rateLimit from "express-rate-limit";
import { config } from "../config";
import { logger } from "../utils/logger";

// Create rate limiter middleware
export const rateLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs, // 15 minutes by default
  max: config.security.rateLimitMaxRequests, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      message: "Too many requests from this IP, please try again later",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: Math.ceil(config.security.rateLimitWindowMs / 1000),
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn("Rate limit exceeded", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get("User-Agent"),
    });

    res.status(429).json({
      success: false,
      error: {
        message: "Too many requests from this IP, please try again later",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil(config.security.rateLimitWindowMs / 1000),
      },
    });
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/health" || req.path === "/api/v1/health";
  },
  keyGenerator: (req) => {
    // Use IP address as key, but could be extended to use user ID if authenticated
    return req.ip || "unknown";
  },
});

// Create stricter rate limiter for sensitive endpoints
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: {
      message:
        "Too many requests to this sensitive endpoint, please try again later",
      code: "STRICT_RATE_LIMIT_EXCEEDED",
      retryAfter: 900,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn("Strict rate limit exceeded", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get("User-Agent"),
    });

    res.status(429).json({
      success: false,
      error: {
        message:
          "Too many requests to this sensitive endpoint, please try again later",
        code: "STRICT_RATE_LIMIT_EXCEEDED",
        retryAfter: 900,
      },
    });
  },
});

// Create rate limiter for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    error: {
      message: "Too many authentication attempts, please try again later",
      code: "AUTH_RATE_LIMIT_EXCEEDED",
      retryAfter: 900,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn("Authentication rate limit exceeded", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get("User-Agent"),
    });

    res.status(429).json({
      success: false,
      error: {
        message: "Too many authentication attempts, please try again later",
        code: "AUTH_RATE_LIMIT_EXCEEDED",
        retryAfter: 900,
      },
    });
  },
});
