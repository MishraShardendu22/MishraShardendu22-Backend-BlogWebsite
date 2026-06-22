import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../config/database.js";
import { cache } from "../utils/cache.js";
import {
	createBlog,
	deleteBlog,
	getAllBlogs,
	getBlogById,
	updateBlog,
} from "./blogController.js";

vi.mock("../config/database.js", () => {
	return {
		db: {
			select: vi.fn(),
			insert: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
	};
});

vi.mock("../utils/cache.js", () => ({
	cache: {
		get: vi.fn(),
		set: vi.fn(),
		del: vi.fn(),
		invalidatePattern: vi.fn(),
	},
}));

vi.mock("drizzle-orm", async () => {
	const actual = await vi.importActual("drizzle-orm");
	return {
		...actual,
		count: vi.fn(),
		asc: vi.fn(),
		eq: vi.fn(),
		sql: vi.fn(() => ({ as: vi.fn() })),
	};
});

const makeChain = (value: any) => {
	const chain: any = {};
	const fn = vi.fn().mockReturnValue(chain);
	chain.from = fn;
	chain.leftJoin = fn;
	chain.where = fn;
	chain.limit = fn;
	chain.offset = fn;
	chain.orderBy = fn;
	chain.values = fn;
	chain.returning = fn;
	chain.set = fn;
	chain.then = (onfulfilled: any) => Promise.resolve(value).then(onfulfilled);
	return chain;
};

describe("blogController", () => {
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockRequest = {
			query: {},
			params: {},
			body: {},
		};
		mockResponse = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		};
	});

	describe("getAllBlogs", () => {
		it("should return blogs from cache if available", async () => {
			const cached = { success: true, data: [] };
			(cache.get as any).mockResolvedValueOnce(JSON.stringify(cached));

			await getAllBlogs(mockRequest as Request, mockResponse as Response);

			expect(cache.get).toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith(cached);
		});

		it("should fetch blogs from db, return 200, and cache response", async () => {
			(cache.get as any).mockResolvedValueOnce(null);

			const mockBlogs = [{ id: 1, title: "Blog 1" }];
			(db.select as any)
				.mockReturnValueOnce(makeChain(mockBlogs))
				.mockReturnValueOnce(makeChain([{ count: 1 }]));

			await getAllBlogs(mockRequest as Request, mockResponse as Response);

			expect(db.select).toHaveBeenCalledTimes(2);
			expect(cache.set).toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: true,
				data: mockBlogs,
				pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
			});
		});

		it("should handle error and return 500", async () => {
			(cache.get as any).mockResolvedValueOnce(null);
			(db.select as any).mockImplementationOnce(() => {
				throw new Error("DB Error");
			});

			await getAllBlogs(mockRequest as Request, mockResponse as Response);

			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: false,
				error: "Failed to fetch blogs",
			});
		});
	});

	describe("getBlogById", () => {
		it("should return 400 if ID is invalid", async () => {
			mockRequest.params = { id: "invalid" };

			await getBlogById(mockRequest as Request, mockResponse as Response);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: false,
				error: "Invalid blog ID",
			});
		});

		it("should return 404 if blog is not found", async () => {
			mockRequest.params = { id: "1" };
			(cache.get as any).mockResolvedValueOnce(null);
			(db.select as any)
				.mockReturnValueOnce(makeChain([])) // blog query
				.mockReturnValueOnce(makeChain([{ count: 0 }])); // comments count

			await getBlogById(mockRequest as Request, mockResponse as Response);

			expect(mockResponse.status).toHaveBeenCalledWith(404);
		});

		it("should return blog details and cache them", async () => {
			mockRequest.params = { id: "1" };
			(cache.get as any).mockResolvedValueOnce(null);
			(db.select as any)
				.mockReturnValueOnce(makeChain([{ id: 1, title: "Blog 1" }]))
				.mockReturnValueOnce(makeChain([{ count: 3 }]));

			await getBlogById(mockRequest as Request, mockResponse as Response);

			expect(cache.set).toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: true,
				data: { id: 1, title: "Blog 1", comments: 3 },
			});
		});
	});

	describe("createBlog", () => {
		it("should return 400 if title or content is missing", async () => {
			mockRequest.body = { title: "Title only" };
			mockRequest.user = {
				id: 1,
				email: "owner@example.com",
				name: "Owner",
				isOwner: true,
			};

			await createBlog(mockRequest as Request, mockResponse as Response);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
		});

		it("should return 400 if image URL is invalid", async () => {
			mockRequest.body = {
				title: "Title",
				content: "Content",
				image: "invalid-url",
			};
			mockRequest.user = {
				id: 1,
				email: "owner@example.com",
				name: "Owner",
				isOwner: true,
			};

			await createBlog(mockRequest as Request, mockResponse as Response);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
		});

		it("should create a blog and return 201", async () => {
			mockRequest.body = {
				title: "Title",
				content: "Content",
				image: "https://example.com/img.png",
			};
			mockRequest.user = {
				id: 1,
				email: "owner@example.com",
				name: "Owner",
				isOwner: true,
			};

			(db.select as any).mockReturnValueOnce(makeChain([{ count: 5 }]));
			(db.insert as any).mockReturnValueOnce(
				makeChain([{ id: 6, title: "Title" }]),
			);

			await createBlog(mockRequest as Request, mockResponse as Response);

			expect(db.insert).toHaveBeenCalled();
			expect(cache.invalidatePattern).toHaveBeenCalledWith("blogs:*");
			expect(mockResponse.status).toHaveBeenCalledWith(201);
		});
	});

	describe("updateBlog", () => {
		it("should return 404 if blog does not exist", async () => {
			mockRequest.params = { id: "1" };
			mockRequest.body = { title: "New Title" };
			(db.select as any).mockReturnValueOnce(makeChain([]));

			await updateBlog(mockRequest as Request, mockResponse as Response);

			expect(mockResponse.status).toHaveBeenCalledWith(404);
		});

		it("should update and invalidate cache on success", async () => {
			mockRequest.params = { id: "1" };
			mockRequest.body = { title: "New Title" };
			(db.select as any).mockReturnValueOnce(
				makeChain([{ id: 1, title: "Old Title" }]),
			);
			(db.update as any).mockReturnValueOnce(
				makeChain([{ id: 1, title: "New Title" }]),
			);

			await updateBlog(mockRequest as Request, mockResponse as Response);

			expect(db.update).toHaveBeenCalled();
			expect(cache.del).toHaveBeenCalledWith("blog:1");
			expect(mockResponse.status).toHaveBeenCalledWith(200);
		});
	});

	describe("deleteBlog", () => {
		it("should delete blog and return 200", async () => {
			mockRequest.params = { id: "1" };
			(db.select as any).mockReturnValueOnce(makeChain([{ id: 1 }]));
			(db.delete as any).mockReturnValueOnce(makeChain([]));

			await deleteBlog(mockRequest as Request, mockResponse as Response);

			expect(db.delete).toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(200);
		});
	});
});
