import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../config/database.js";
import {
	cleanExpiredOTPs,
	deleteOTP,
	generateOTP,
	storeOTP,
	verifyOTP,
} from "./otpService.js";

vi.mock("../config/database.js", () => {
	const mockDeleteWhereReturning = vi.fn().mockResolvedValue([]);
	const mockDeleteWhere = vi.fn().mockReturnValue({
		returning: mockDeleteWhereReturning,
	});
	const mockDelete = vi.fn().mockReturnValue({
		where: mockDeleteWhere,
	});

	const mockInsertValues = vi.fn().mockResolvedValue({});
	const mockInsert = vi.fn().mockReturnValue({
		values: mockInsertValues,
	});

	const mockLimit = vi.fn().mockResolvedValue([]);
	const mockSelectWhere = vi.fn().mockReturnValue({
		limit: mockLimit,
	});
	const mockFrom = vi.fn().mockReturnValue({
		where: mockSelectWhere,
	});
	const mockSelect = vi.fn().mockReturnValue({
		from: mockFrom,
	});

	return {
		db: {
			delete: mockDelete,
			insert: mockInsert,
			select: mockSelect,
		},
	};
});

vi.mock("bcryptjs", () => ({
	default: {
		hash: vi.fn().mockResolvedValue("mocked_hash"),
		compare: vi.fn().mockResolvedValue(true),
	},
}));

describe("OTP Service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("generateOTP", () => {
		it("should generate a 6-digit string", () => {
			const otp = generateOTP();
			expect(otp).toHaveLength(6);
			expect(Number(otp)).toBeGreaterThanOrEqual(100000);
			expect(Number(otp)).toBeLessThanOrEqual(999999);
		});
	});

	describe("storeOTP", () => {
		it("should hash OTP and insert into database", async () => {
			const email = "test@example.com";
			const otp = "123456";

			const deleteWhereMock = vi.fn();
			(db.delete as any).mockReturnValue({
				where: deleteWhereMock,
			});

			const insertValuesMock = vi.fn().mockResolvedValue({});
			(db.insert as any).mockReturnValue({
				values: insertValuesMock,
			});

			const success = await storeOTP(email, otp);

			expect(bcrypt.hash).toHaveBeenCalledWith(otp, 10);
			expect(db.delete).toHaveBeenCalled();
			expect(deleteWhereMock).toHaveBeenCalled();
			expect(db.insert).toHaveBeenCalled();
			expect(insertValuesMock).toHaveBeenCalledWith(
				expect.objectContaining({
					email,
					otpHash: "mocked_hash",
					expiresAt: expect.any(Date),
				}),
			);
			expect(success).toBe(true);
		});

		it("should return false if database throws error", async () => {
			(db.delete as any).mockImplementationOnce(() => {
				throw new Error("DB Error");
			});

			const success = await storeOTP("test@example.com", "123456");
			expect(success).toBe(false);
		});
	});

	describe("verifyOTP", () => {
		it("should return false if no record is found", async () => {
			const mockLimit = vi.fn().mockResolvedValue([]);
			const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockLimit });
			const mockFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
			(db.select as any).mockReturnValue({ from: mockFrom });

			const isValid = await verifyOTP("test@example.com", "123456");

			expect(isValid).toBe(false);
		});

		it("should return false and delete OTP if expired", async () => {
			const record = {
				email: "test@example.com",
				otpHash: "mocked_hash",
				expiresAt: new Date(Date.now() - 1000), // expired
			};

			const mockLimit = vi.fn().mockResolvedValue([record]);
			const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockLimit });
			const mockFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
			(db.select as any).mockReturnValue({ from: mockFrom });

			const mockDeleteWhere = vi.fn();
			(db.delete as any).mockReturnValue({ where: mockDeleteWhere });

			const isValid = await verifyOTP("test@example.com", "123456");

			expect(isValid).toBe(false);
			expect(db.delete).toHaveBeenCalled();
			expect(mockDeleteWhere).toHaveBeenCalled();
		});

		it("should return true and delete OTP if valid", async () => {
			const record = {
				email: "test@example.com",
				otpHash: "mocked_hash",
				expiresAt: new Date(Date.now() + 100000), // valid
			};

			const mockLimit = vi.fn().mockResolvedValue([record]);
			const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockLimit });
			const mockFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
			(db.select as any).mockReturnValue({ from: mockFrom });

			const mockDeleteWhere = vi.fn();
			(db.delete as any).mockReturnValue({ where: mockDeleteWhere });

			(bcrypt.compare as any).mockResolvedValueOnce(true);

			const isValid = await verifyOTP("test@example.com", "123456");

			expect(isValid).toBe(true);
			expect(bcrypt.compare).toHaveBeenCalledWith("123456", "mocked_hash");
			expect(db.delete).toHaveBeenCalled();
			expect(mockDeleteWhere).toHaveBeenCalled();
		});

		it("should return false and not delete OTP if invalid", async () => {
			const record = {
				email: "test@example.com",
				otpHash: "mocked_hash",
				expiresAt: new Date(Date.now() + 100000), // valid
			};

			const mockLimit = vi.fn().mockResolvedValue([record]);
			const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockLimit });
			const mockFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
			(db.select as any).mockReturnValue({ from: mockFrom });

			(bcrypt.compare as any).mockResolvedValueOnce(false);

			const isValid = await verifyOTP("test@example.com", "wrong_otp");

			expect(isValid).toBe(false);
			expect(db.delete).not.toHaveBeenCalled();
		});

		it("should return false on catch block", async () => {
			(db.select as any).mockImplementationOnce(() => {
				throw new Error("DB Error");
			});

			const isValid = await verifyOTP("test@example.com", "123456");
			expect(isValid).toBe(false);
		});
	});

	describe("cleanExpiredOTPs", () => {
		it("should clean expired OTPs and return deleted count", async () => {
			const mockReturning = vi.fn().mockResolvedValue([{}, {}]);
			const mockDeleteWhere = vi
				.fn()
				.mockReturnValue({ returning: mockReturning });
			(db.delete as any).mockReturnValue({ where: mockDeleteWhere });

			const count = await cleanExpiredOTPs();

			expect(db.delete).toHaveBeenCalled();
			expect(mockDeleteWhere).toHaveBeenCalled();
			expect(count).toBe(2);
		});

		it("should return 0 on error", async () => {
			(db.delete as any).mockImplementationOnce(() => {
				throw new Error("DB Error");
			});

			const count = await cleanExpiredOTPs();
			expect(count).toBe(0);
		});
	});

	describe("deleteOTP", () => {
		it("should delete OTP for email and return true", async () => {
			const mockDeleteWhere = vi.fn();
			(db.delete as any).mockReturnValue({ where: mockDeleteWhere });

			const success = await deleteOTP("test@example.com");

			expect(db.delete).toHaveBeenCalled();
			expect(mockDeleteWhere).toHaveBeenCalled();
			expect(success).toBe(true);
		});

		it("should return false on error", async () => {
			(db.delete as any).mockImplementationOnce(() => {
				throw new Error("DB Error");
			});

			const success = await deleteOTP("test@example.com");
			expect(success).toBe(false);
		});
	});
});
