import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyToken } from "../config/auth.js";
import { db } from "../config/database.js";
import { optionalAuth, requireAuth, requireOwner } from "./auth.js";

vi.mock("../config/auth.js", () => ({
	verifyToken: vi.fn(),
}));

vi.mock("../config/database.js", () => {
	const mockLimit = vi.fn().mockResolvedValue([]);
	const mockWhere = vi.fn().mockReturnValue({
		limit: mockLimit,
	});
	const mockFrom = vi.fn().mockReturnValue({
		where: mockWhere,
	});
	const mockSelect = vi.fn().mockReturnValue({
		from: mockFrom,
	});

	return {
		db: {
			select: mockSelect,
		},
	};
});

vi.mock("jsonwebtoken", () => {
	const mockVerify = vi.fn();
	const mockSign = vi.fn();
	return {
		default: {
			verify: mockVerify,
			sign: mockSign,
		},
		verify: mockVerify,
		sign: mockSign,
	};
});

describe("Auth Middleware", () => {
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;
	const nextFunction: NextFunction = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockRequest = {
			headers: {},
		};
		mockResponse = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		};
	});

	describe("requireAuth", () => {
		it("should return 401 if authorization header is missing", async () => {
			await requireAuth(
				mockRequest as Request,
				mockResponse as Response,
				nextFunction,
			);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: false,
				error: "Unauthorized",
			});
			expect(nextFunction).not.toHaveBeenCalled();
		});

		it("should return 401 if token verification fails", async () => {
			mockRequest.headers = { authorization: "Bearer invalid_token" };
			(verifyToken as any).mockReturnValueOnce(null);

			await requireAuth(
				mockRequest as Request,
				mockResponse as Response,
				nextFunction,
			);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(nextFunction).not.toHaveBeenCalled();
		});

		it("should return 401 if user not found in database", async () => {
			mockRequest.headers = { authorization: "Bearer valid_token" };
			(verifyToken as any).mockReturnValueOnce({ userId: 1 });

			const mockLimit = vi.fn().mockResolvedValue([]);
			const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
			const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
			(db.select as any).mockReturnValue({ from: mockFrom });

			await requireAuth(
				mockRequest as Request,
				mockResponse as Response,
				nextFunction,
			);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(nextFunction).not.toHaveBeenCalled();
		});

		it("should authorize user and call next() if token is valid and user exists", async () => {
			mockRequest.headers = { authorization: "Bearer valid_token" };
			(verifyToken as any).mockReturnValueOnce({ userId: 1 });

			const mockUser = { id: 1, email: "user@example.com", name: "Test User" };
			const mockLimit = vi.fn().mockResolvedValue([mockUser]);
			const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
			const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
			(db.select as any).mockReturnValue({ from: mockFrom });

			await requireAuth(
				mockRequest as Request,
				mockResponse as Response,
				nextFunction,
			);

			expect(mockRequest.user).toBeDefined();
			expect(mockRequest.user?.id).toBe(1);
			expect(mockRequest.user?.isOwner).toBe(false);
			expect(nextFunction).toHaveBeenCalled();
		});

		it("should mark user as owner if email matches OWNER_EMAIL", async () => {
			mockRequest.headers = { authorization: "Bearer valid_token" };
			(verifyToken as any).mockReturnValueOnce({ userId: 1 });

			const mockUser = {
				id: 1,
				email: "owner@example.com",
				name: "Owner User",
			};
			const mockLimit = vi.fn().mockResolvedValue([mockUser]);
			const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
			const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
			(db.select as any).mockReturnValue({ from: mockFrom });

			await requireAuth(
				mockRequest as Request,
				mockResponse as Response,
				nextFunction,
			);

			expect(mockRequest.user?.isOwner).toBe(true);
			expect(nextFunction).toHaveBeenCalled();
		});

		it("should return 401 on database error", async () => {
			mockRequest.headers = { authorization: "Bearer valid_token" };
			(verifyToken as any).mockReturnValueOnce({ userId: 1 });

			(db.select as any).mockImplementationOnce(() => {
				throw new Error("DB Error");
			});

			await requireAuth(
				mockRequest as Request,
				mockResponse as Response,
				nextFunction,
			);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(nextFunction).not.toHaveBeenCalled();
		});
	});

	describe("requireOwner", () => {
		it("should allow verified owner", async () => {
			mockRequest.headers = { authorization: "Bearer owner_token" };
			(verifyToken as any).mockReturnValueOnce({ userId: 1 });

			const mockUser = {
				id: 1,
				email: "owner@example.com",
				name: "Owner User",
			};
			const mockLimit = vi.fn().mockResolvedValue([mockUser]);
			const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
			const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
			(db.select as any).mockReturnValue({ from: mockFrom });

			await requireOwner(
				mockRequest as Request,
				mockResponse as Response,
				nextFunction,
			);

			expect(mockRequest.user?.isOwner).toBe(true);
			expect(nextFunction).toHaveBeenCalled();
		});

		it("should deny normal authenticated user with 403 Forbidden", async () => {
			mockRequest.headers = { authorization: "Bearer normal_token" };
			(verifyToken as any).mockReturnValueOnce({ userId: 2 });

			const mockUser = {
				id: 2,
				email: "user@example.com",
				name: "Normal User",
			};
			const mockLimit = vi.fn().mockResolvedValue([mockUser]);
			const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
			const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
			(db.select as any).mockReturnValue({ from: mockFrom });

			await requireOwner(
				mockRequest as Request,
				mockResponse as Response,
				nextFunction,
			);

			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(nextFunction).not.toHaveBeenCalled();
		});

		it("should authenticate owner using portfolio JWT token if db auth fails", async () => {
			mockRequest.headers = { authorization: "Bearer portfolio_token" };
			(verifyToken as any).mockReturnValueOnce(null); // not a DB token

			(jwt.verify as any).mockReturnValueOnce({
				email: "owner@example.com",
				id: "p1",
			});

			await requireOwner(
				mockRequest as Request,
				mockResponse as Response,
				nextFunction,
			);

			expect(mockRequest.user?.email).toBe("owner@example.com");
			expect(mockRequest.user?.isOwner).toBe(true);
			expect(nextFunction).toHaveBeenCalled();
		});

		it("should return 401 if both DB auth and portfolio token verification fail", async () => {
			mockRequest.headers = { authorization: "Bearer bad_token" };
			(verifyToken as any).mockReturnValueOnce(null);
			(jwt.verify as any).mockImplementationOnce(() => {
				throw new Error("Invalid jwt");
			});

			await requireOwner(
				mockRequest as Request,
				mockResponse as Response,
				nextFunction,
			);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(nextFunction).not.toHaveBeenCalled();
		});
	});

	describe("optionalAuth", () => {
		it("should set user if token is valid", async () => {
			mockRequest.headers = { authorization: "Bearer valid_token" };
			(verifyToken as any).mockReturnValueOnce({ userId: 1 });

			const mockUser = { id: 1, email: "user@example.com", name: "Test User" };
			const mockLimit = vi.fn().mockResolvedValue([mockUser]);
			const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
			const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
			(db.select as any).mockReturnValue({ from: mockFrom });

			await optionalAuth(
				mockRequest as Request,
				mockResponse as Response,
				nextFunction,
			);

			expect(mockRequest.user).toBeDefined();
			expect(nextFunction).toHaveBeenCalled();
		});

		it("should call next() without setting user if no token provided", async () => {
			await optionalAuth(
				mockRequest as Request,
				mockResponse as Response,
				nextFunction,
			);

			expect(mockRequest.user).toBeUndefined();
			expect(nextFunction).toHaveBeenCalled();
		});
	});
});
