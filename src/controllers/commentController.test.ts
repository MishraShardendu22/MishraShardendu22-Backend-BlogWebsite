import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../config/database.js";
import {
	createComment,
	deleteComment,
	getCommentsByBlogId,
} from "./commentController.js";

vi.mock("../config/database.js", () => {
	return {
		db: {
			select: vi.fn(),
			insert: vi.fn(),
			delete: vi.fn(),
		},
	};
});

vi.mock("../utils/cache.js", () => ({
	cache: {
		del: vi.fn(),
		invalidatePattern: vi.fn(),
	},
}));

vi.mock("drizzle-orm", async () => {
	const actual = await vi.importActual("drizzle-orm");
	return {
		...actual,
		count: vi.fn(),
		desc: vi.fn(),
		eq: vi.fn(),
		and: vi.fn(),
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
	chain.then = (onfulfilled: any) => Promise.resolve(value).then(onfulfilled);
	return chain;
};

describe("commentController", () => {
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockRequest = {
			params: {},
			query: {},
			body: {},
		};
		mockResponse = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		};
	});

	describe("getCommentsByBlogId", () => {
		it("should return 400 if blog ID is invalid", async () => {
			mockRequest.params = { id: "invalid" };

			await getCommentsByBlogId(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
		});

		it("should return 404 if blog does not exist", async () => {
			mockRequest.params = { id: "1" };

			(db.select as any)
				.mockReturnValueOnce(makeChain([])) // blog
				.mockReturnValueOnce(makeChain([])) // comments
				.mockReturnValueOnce(makeChain([{ count: 0 }])); // count

			await getCommentsByBlogId(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(mockResponse.status).toHaveBeenCalledWith(404);
		});

		it("should return comments on success", async () => {
			mockRequest.params = { id: "1" };

			const mockComments = [{ id: 10, content: "Great post!" }];
			(db.select as any)
				.mockReturnValueOnce(makeChain([{ id: 1 }])) // blog
				.mockReturnValueOnce(makeChain(mockComments)) // comments
				.mockReturnValueOnce(makeChain([{ count: 1 }])); // count

			await getCommentsByBlogId(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: true,
				data: mockComments,
				pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
			});
		});
	});

	describe("createComment", () => {
		it("should require content", async () => {
			mockRequest.params = { id: "1" };
			mockRequest.body = {};
			mockRequest.user = {
				id: 1,
				email: "u@example.com",
				name: "User",
				isOwner: false,
			};

			await createComment(mockRequest as Request, mockResponse as Response);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
		});

		it("should check if user is verified", async () => {
			mockRequest.params = { id: "1" };
			mockRequest.body = { content: "Nice" };
			mockRequest.user = {
				id: 1,
				email: "u@example.com",
				name: "User",
				isOwner: false,
			};

			(db.select as any)
				.mockReturnValueOnce(makeChain([{ isVerified: false }])) // user verification
				.mockReturnValueOnce(makeChain([{ id: 1 }])); // blog

			await createComment(mockRequest as Request, mockResponse as Response);

			expect(mockResponse.status).toHaveBeenCalledWith(403);
		});

		it("should create comment if user is verified", async () => {
			mockRequest.params = { id: "1" };
			mockRequest.body = { content: "Nice" };
			mockRequest.user = {
				id: 1,
				email: "u@example.com",
				name: "User",
				isOwner: false,
			};

			(db.select as any)
				.mockReturnValueOnce(makeChain([{ isVerified: true }])) // user verification
				.mockReturnValueOnce(makeChain([{ id: 1 }])); // blog

			const mockComment = { id: 100, content: "Nice", userId: 1, blogId: 1 };
			(db.insert as any).mockReturnValueOnce(makeChain([mockComment]));
			(db.select as any).mockReturnValueOnce(
				makeChain([{ id: 1, name: "User", email: "u@example.com" }]),
			); // user info

			await createComment(mockRequest as Request, mockResponse as Response);

			expect(db.insert).toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(201);
		});
	});

	describe("deleteComment", () => {
		it("should return 404 if comment or blog is not found", async () => {
			mockRequest.params = { id: "1", commentId: "2" };
			mockRequest.user = {
				id: 1,
				email: "u@example.com",
				name: "User",
				isOwner: false,
			};

			(db.select as any)
				.mockReturnValueOnce(makeChain([{ id: 1 }])) // blog
				.mockReturnValueOnce(makeChain([])); // comment not found

			await deleteComment(mockRequest as Request, mockResponse as Response);

			expect(mockResponse.status).toHaveBeenCalledWith(404);
		});

		it("should allow comment author to delete", async () => {
			mockRequest.params = { id: "1", commentId: "2" };
			mockRequest.user = {
				id: 1,
				email: "u@example.com",
				name: "User",
				isOwner: false,
			};

			(db.select as any)
				.mockReturnValueOnce(makeChain([{ id: 1 }])) // blog
				.mockReturnValueOnce(makeChain([{ id: 2, userId: 1 }])); // comment author matches user.id
			(db.delete as any).mockReturnValueOnce(makeChain([]));

			await deleteComment(mockRequest as Request, mockResponse as Response);

			expect(db.delete).toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(200);
		});

		it("should allow owner to delete anyone's comment", async () => {
			mockRequest.params = { id: "1", commentId: "2" };
			mockRequest.user = {
				id: 5,
				email: "owner@example.com",
				name: "Owner",
				isOwner: true,
			}; // user is owner

			(db.select as any)
				.mockReturnValueOnce(makeChain([{ id: 1 }])) // blog
				.mockReturnValueOnce(makeChain([{ id: 2, userId: 10 }])); // comment author is someone else
			(db.delete as any).mockReturnValueOnce(makeChain([]));

			await deleteComment(mockRequest as Request, mockResponse as Response);

			expect(db.delete).toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(200);
		});

		it("should deny non-author non-owner", async () => {
			mockRequest.params = { id: "1", commentId: "2" };
			mockRequest.user = {
				id: 5,
				email: "other@example.com",
				name: "Other",
				isOwner: false,
			};

			(db.select as any)
				.mockReturnValueOnce(makeChain([{ id: 1 }])) // blog
				.mockReturnValueOnce(makeChain([{ id: 2, userId: 10 }])); // comment author is someone else

			await deleteComment(mockRequest as Request, mockResponse as Response);

			expect(db.delete).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(403);
		});
	});
});
