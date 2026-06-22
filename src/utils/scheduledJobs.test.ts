import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../config/database.js";
import { cleanExpiredOTPs } from "./otpService.js";
import { cleanupExpiredData, startCleanupJob } from "./scheduledJobs.js";

vi.mock("../config/database.js", () => {
	const mockReturning = vi.fn().mockResolvedValue([]);
	const mockDeleteWhere = vi.fn().mockReturnValue({
		returning: mockReturning,
	});
	const mockDelete = vi.fn().mockReturnValue({
		where: mockDeleteWhere,
	});

	return {
		db: {
			delete: mockDelete,
		},
	};
});

vi.mock("./otpService.js", () => ({
	cleanExpiredOTPs: vi.fn().mockResolvedValue(0),
}));

describe("Scheduled Jobs", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("cleanupExpiredData", () => {
		it("should clean expired OTPs and delete unverified users", async () => {
			const mockReturning = vi
				.fn()
				.mockResolvedValue([{ email: "unverified@example.com" }]);
			const mockDeleteWhere = vi.fn().mockReturnValue({
				returning: mockReturning,
			});
			(db.delete as any).mockReturnValue({
				where: mockDeleteWhere,
			});

			(cleanExpiredOTPs as any).mockResolvedValueOnce(5);

			await cleanupExpiredData();

			expect(cleanExpiredOTPs).toHaveBeenCalled();
			expect(db.delete).toHaveBeenCalled();
			expect(mockDeleteWhere).toHaveBeenCalled();
			expect(mockReturning).toHaveBeenCalled();
		});

		it("should handle error in cleanup gracefully", async () => {
			(cleanExpiredOTPs as any).mockRejectedValueOnce(
				new Error("Cleanup failed"),
			);

			// Should not throw
			await expect(cleanupExpiredData()).resolves.not.toThrow();
		});
	});

	describe("startCleanupJob", () => {
		it("should call cleanupExpiredData immediately and start interval", async () => {
			const mockReturning = vi.fn().mockResolvedValue([]);
			const mockDeleteWhere = vi.fn().mockReturnValue({
				returning: mockReturning,
			});
			(db.delete as any).mockReturnValue({
				where: mockDeleteWhere,
			});

			const interval = startCleanupJob(10);
			expect(interval).toBeDefined();

			// cleanupExpiredData called immediately
			expect(cleanExpiredOTPs).toHaveBeenCalledTimes(1);

			// Fast forward time by 10 minutes
			await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
			expect(cleanExpiredOTPs).toHaveBeenCalledTimes(2);

			clearInterval(interval);
		});
	});
});
