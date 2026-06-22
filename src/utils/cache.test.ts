import { beforeEach, describe, expect, it, vi } from "vitest";
import { cache } from "./cache.js";

// Mock Upstash Redis
const mockRedis = vi.hoisted(() => ({
	get: vi.fn(),
	set: vi.fn(),
	del: vi.fn(),
	keys: vi.fn(),
}));

vi.mock("@upstash/redis", () => {
	return {
		Redis: class {
			get = mockRedis.get;
			set = mockRedis.set;
			del = mockRedis.del;
			keys = mockRedis.keys;
		},
	};
});

describe("Cache Utility", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should get data from cache", async () => {
		mockRedis.get.mockResolvedValueOnce("cached_value");
		const result = await cache.get("test_key");
		expect(result).toBe("cached_value");
		expect(mockRedis.get).toHaveBeenCalledWith("test_key");
	});

	it("should handle get errors gracefully", async () => {
		mockRedis.get.mockRejectedValueOnce(new Error("Redis error"));
		const result = await cache.get("test_key");
		expect(result).toBeNull();
	});

	it("should set data in cache", async () => {
		await cache.set("test_key", { a: 1 }, 100);
		expect(mockRedis.set).toHaveBeenCalledWith(
			"test_key",
			JSON.stringify({ a: 1 }),
			{ ex: 100 },
		);
	});

	it("should delete data from cache", async () => {
		await cache.del("test_key");
		expect(mockRedis.del).toHaveBeenCalledWith("test_key");
	});

	it("should invalidate pattern", async () => {
		mockRedis.keys.mockResolvedValueOnce(["key1", "key2"]);
		await cache.invalidatePattern("key*");
		expect(mockRedis.keys).toHaveBeenCalledWith("key*");
		expect(mockRedis.del).toHaveBeenCalledWith("key1", "key2");
	});
});
