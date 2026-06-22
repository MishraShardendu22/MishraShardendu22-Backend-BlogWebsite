import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../config/database.js";
import { cache } from "../utils/cache.js";
import { getBlogStats } from "./statsController.js";

vi.mock("../config/database.js", () => {
	return {
		db: {
			select: vi.fn(),
		},
	};
});

vi.mock("../utils/cache.js", () => ({
	cache: {
		get: vi.fn(),
		set: vi.fn(),
	},
}));

vi.mock("drizzle-orm", async () => {
	const actual = await vi.importActual("drizzle-orm");
	return {
		...actual,
		count: vi.fn(),
		desc: vi.fn(),
		eq: vi.fn(),
		sql: vi.fn(() => ({ as: vi.fn() })),
	};
});

const makeChain = (value: any) => {
	const chain: any = {};
	const fn = vi.fn().mockReturnValue(chain);
	chain.from = fn;
	chain.leftJoin = fn;
	chain.orderBy = fn;
	chain.limit = fn;
	chain.then = (onfulfilled: any) => Promise.resolve(value).then(onfulfilled);
	return chain;
};

describe("statsController", () => {
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockRequest = {};
		mockResponse = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		};
	});

	it("should return stats from cache if available", async () => {
		const cachedStats = {
			success: true,
			data: {
				totalPosts: 10,
				totalComments: 5,
				recentPosts: [],
				popularTags: [],
			},
		};
		(cache.get as any).mockResolvedValueOnce(JSON.stringify(cachedStats));

		await getBlogStats(mockRequest as Request, mockResponse as Response);

		expect(cache.get).toHaveBeenCalledWith("blog-stats");
		expect(db.select).not.toHaveBeenCalled();
		expect(mockResponse.status).toHaveBeenCalledWith(200);
		expect(mockResponse.json).toHaveBeenCalledWith(cachedStats);
	});

	it("should calculate stats from database and cache them if not cached", async () => {
		(cache.get as any).mockResolvedValueOnce(null);

		const mockRecentPosts = [
			{
				id: 1,
				image: "image.jpg",
				title: "Post 1",
				content: "Content 1",
				tags: ["tag1", "tag2"],
				authorId: 10,
				createdAt: new Date("2026-06-22T00:00:00.000Z"),
				updatedAt: new Date("2026-06-22T00:00:00.000Z"),
				authorEmail: "author@example.com",
				authorName: "Author",
				firstName: "First",
				lastName: "Last",
				avatar: "avatar.png",
				profileImage: "pimage.png",
				comments: 2,
			},
		];

		(db.select as any)
			.mockReturnValueOnce(makeChain([{ count: 10 }])) // totalPosts
			.mockReturnValueOnce(makeChain([{ count: 5 }])) // totalComments
			.mockReturnValueOnce(makeChain(mockRecentPosts)) // recentPosts
			.mockReturnValueOnce(
				makeChain([{ tags: ["tag1", "tag2"] }, { tags: ["tag1"] }]),
			); // allTags

		await getBlogStats(mockRequest as Request, mockResponse as Response);

		expect(db.select).toHaveBeenCalledTimes(4);
		expect(cache.set).toHaveBeenCalledWith(
			"blog-stats",
			expect.any(Object),
			600,
		);
		expect(mockResponse.status).toHaveBeenCalledWith(200);
		expect(mockResponse.json).toHaveBeenCalledWith({
			success: true,
			data: {
				totalPosts: 10,
				totalComments: 5,
				recentPosts: [
					{
						id: 1,
						title: "Post 1",
						content: "Content 1",
						tags: ["tag1", "tag2"],
						authorId: 10,
						createdAt: "2026-06-22T00:00:00.000Z",
						updatedAt: "2026-06-22T00:00:00.000Z",
						comments: 2,
						author: {
							id: 10,
							email: "author@example.com",
							name: "First Last",
							avatar: "avatar.png",
							profileImage: "pimage.png",
						},
						image: "image.jpg",
					},
				],
				popularTags: [
					{ tag: "tag1", count: 2 },
					{ tag: "tag2", count: 1 },
				],
			},
		});
	});

	it("should handle DB errors gracefully and return 500", async () => {
		(cache.get as any).mockResolvedValueOnce(null);
		(db.select as any).mockImplementationOnce(() => {
			throw new Error("DB Connection Error");
		});

		await getBlogStats(mockRequest as Request, mockResponse as Response);

		expect(mockResponse.status).toHaveBeenCalledWith(500);
		expect(mockResponse.json).toHaveBeenCalledWith({
			success: false,
			error: "Failed to fetch blog statistics",
		});
	});
});
