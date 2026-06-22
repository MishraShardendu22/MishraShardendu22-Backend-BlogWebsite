import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../config/database.js";
import { getBlogsInOrder, reorderBlogs } from "./reorder.js";

vi.mock("../config/database.js", () => ({
	db: {
		execute: vi.fn(),
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				orderBy: vi.fn(),
			})),
		})),
	},
}));

vi.mock("drizzle-orm", async () => {
	const actual = await vi.importActual("drizzle-orm");
	return {
		...actual,
		sql: vi.fn((strings, ...values) => ({ strings, values })),
	};
});

describe("reorder controller", () => {
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockResponse = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		};
	});

	describe("reorderBlogs", () => {
		it("should return 400 if request body is invalid", async () => {
			mockRequest = { body: {} };

			await reorderBlogs(mockRequest as Request, mockResponse as Response);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: false,
				error: "Invalid request body",
			});
		});

		it("should return 400 if blog IDs are invalid", async () => {
			mockRequest = { body: [{ id: "invalid", blogId_New: 2 }] };

			await reorderBlogs(mockRequest as Request, mockResponse as Response);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: false,
				error: "Invalid blog IDs",
			});
		});

		it("should update blog orders and return 200", async () => {
			mockRequest = { body: [{ id: 1, blogId_New: 2 }] };
			(db.execute as any).mockResolvedValueOnce({});

			await reorderBlogs(mockRequest as Request, mockResponse as Response);

			expect(db.execute).toHaveBeenCalledTimes(1);
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: true,
				message: "Blogs reordered successfully",
			});
		});

		it("should handle internal errors gracefully", async () => {
			mockRequest = { body: [{ id: 1, blogId_New: 2 }] };
			(db.execute as any).mockRejectedValueOnce(new Error("DB error"));

			await reorderBlogs(mockRequest as Request, mockResponse as Response);

			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: false,
				error: "Internal server error",
			});
		});
	});

	describe("getBlogsInOrder", () => {
		it("should return blogs sorted by orderId", async () => {
			mockRequest = {};
			const mockData = [{ id: 1, title: "Test", orderId: 1 }];

			const mockOrderBy = vi.fn().mockResolvedValue(mockData);
			const mockFrom = vi.fn(() => ({ orderBy: mockOrderBy }));
			(db.select as any).mockReturnValue({ from: mockFrom });

			await getBlogsInOrder(mockRequest as Request, mockResponse as Response);

			expect(db.select).toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: true,
				data: mockData,
			});
		});

		it("should handle internal errors gracefully", async () => {
			mockRequest = {};

			const mockOrderBy = vi.fn().mockRejectedValue(new Error("DB error"));
			const mockFrom = vi.fn(() => ({ orderBy: mockOrderBy }));
			(db.select as any).mockReturnValue({ from: mockFrom });

			await getBlogsInOrder(mockRequest as Request, mockResponse as Response);

			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: false,
				error: "Failed to fetch blogs in order",
			});
		});
	});
});
