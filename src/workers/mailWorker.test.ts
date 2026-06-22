import sgMail from "@sendgrid/mail";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted to declare and initialize variables before vi.mock runs
const { mockOn, getWorkerProcessor, setWorkerProcessor } = vi.hoisted(() => {
	let processor: any = null;
	return {
		mockOn: vi.fn(),
		getWorkerProcessor: () => processor,
		setWorkerProcessor: (p: any) => {
			processor = p;
		},
	};
});

vi.mock("bullmq", () => {
	return {
		Worker: vi.fn().mockImplementation((_name, processor, _options) => {
			setWorkerProcessor(processor);
			return {
				on: mockOn,
			};
		}),
	};
});

vi.mock("@sendgrid/mail", () => ({
	default: {
		setApiKey: vi.fn(),
		send: vi.fn().mockResolvedValue([{ statusCode: 202, headers: {} }]),
	},
}));

// Now import the worker
import { mailWorker } from "./mailWorker.js";

describe("Mail Worker", () => {
	beforeEach(() => {
		(sgMail.send as any).mockClear();
	});

	it("should have initialized worker and registered listeners", () => {
		expect(mailWorker).toBeDefined();
		expect(mockOn).toHaveBeenCalledWith("completed", expect.any(Function));
		expect(mockOn).toHaveBeenCalledWith("failed", expect.any(Function));
		expect(mockOn).toHaveBeenCalledWith("error", expect.any(Function));
	});

	it("should process job using SendGrid when SENDGRID_API_KEY is present", async () => {
		const job = {
			id: "job-123",
			data: {
				from: "from@example.com",
				to: "to@example.com",
				subject: "Test Subject",
				html: "<p>Hello</p>",
			},
		};

		const processor = getWorkerProcessor();
		expect(processor).toBeDefined();

		const result = await processor(job);

		expect(sgMail.send).toHaveBeenCalledWith({
			to: "to@example.com",
			from: "from@example.com",
			subject: "Test Subject",
			html: "<p>Hello</p>",
		});
		expect(result).toEqual({
			success: true,
			statusCode: 202,
			headers: {},
		});
	});

	it("should handle SendGrid error and throw", async () => {
		const job = {
			id: "job-123",
			data: {
				from: "from@example.com",
				to: "to@example.com",
				subject: "Test Subject",
				html: "<p>Hello</p>",
			},
		};

		(sgMail.send as any).mockRejectedValueOnce(new Error("SendGrid Failed"));

		const processor = getWorkerProcessor();
		await expect(processor(job)).rejects.toThrow("SendGrid Failed");
	});
});
