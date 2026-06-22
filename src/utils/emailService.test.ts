import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendOTPEmail } from "./emailService.js";

const mockSend = vi.hoisted(() => vi.fn());

vi.mock("@sendgrid/mail", () => {
	return {
		default: {
			setApiKey: vi.fn(),
			send: mockSend,
		},
	};
});

describe("Email Service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.SENDGRID_API_KEY = "SG.test_key";
		process.env.MAIL_ID = "test@example.com";
	});

	it("should return false if SENDGRID_API_KEY is missing", async () => {
		process.env.SENDGRID_API_KEY = "";
		const result = await sendOTPEmail({
			to_email: "user@example.com",
			to_name: "Test User",
			otp: "123456",
		});
		expect(result).toBe(false);
	});

	it("should send an OTP email successfully", async () => {
		mockSend.mockResolvedValueOnce([{ statusCode: 202 }]);

		const result = await sendOTPEmail({
			to_email: "user@example.com",
			to_name: "Test User",
			otp: "123456",
		});

		expect(result).toBe(true);
		expect(mockSend).toHaveBeenCalled();
	});

	it("should handle send errors gracefully", async () => {
		mockSend.mockRejectedValueOnce(new Error("SendGrid Error"));

		const result = await sendOTPEmail({
			to_email: "error@example.com",
			to_name: "Error User",
			otp: "000000",
		});

		expect(result).toBe(false);
	});
});
