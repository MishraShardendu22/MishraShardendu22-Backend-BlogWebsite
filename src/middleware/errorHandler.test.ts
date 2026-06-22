import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ApiError,
	errorHandler,
	notFoundHandler,
} from "./errorHandler.js";

describe("ErrorHandler Middleware", () => {
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;
	const nextFunction: NextFunction = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockRequest = {};
		mockResponse = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		};
	});

	describe("errorHandler", () => {
		it("should handle error with custom statusCode", () => {
			const error: ApiError = new Error("Bad Request");
			error.statusCode = 400;

			errorHandler(
				error,
				mockRequest as Request,
				mockResponse as Response,
				nextFunction,
			);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: false,
				error: "Bad Request",
			});
		});

		it("should fallback to 500 error if status code not provided", () => {
			const error: ApiError = new Error("Something went wrong");

			errorHandler(
				error,
				mockRequest as Request,
				mockResponse as Response,
				nextFunction,
			);

			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: false,
				error: "Something went wrong",
			});
		});
	});

	describe("notFoundHandler", () => {
		it("should return 404 response", () => {
			notFoundHandler(mockRequest as Request, mockResponse as Response);

			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: false,
				error: "Route not found",
			});
		});
	});
});
