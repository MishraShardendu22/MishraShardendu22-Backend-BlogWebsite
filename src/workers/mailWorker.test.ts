import sgMail from "@sendgrid/mail";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted to declare and initialize variables before vi.mock runs
const { mockOn, getWorkerProcessor, setWorkerProcessor } = vi.hoisted(() => {
	let processor: ((job: unknown) => Promise<unknown>) | null = null;

	return {
		mockOn: vi.fn(),
		getWorkerProcessor: () => processor,
		setWorkerProcessor: (p: (job: unknown) => Promise<unknown>) => {
			processor = p;
		},
	};
});

vi.mock("bullmq", () => {
	class MockWorker {
		on = mockOn;

		constructor(
			_name: string,
			processor: (job: unknown) => Promise<unknown>,
			_options?: unknown,
		) {
			// FIX: Worker is instantiated with `new Worker(...)`, so mock must be a constructible class
			setWorkerProcessor(processor);
		}
	}

	return {
		Worker: MockWorker,
	};
});

vi.mock("@sendgrid/mail", () => ({
	default: {
		setApiKey: vi.fn(),
		send: vi.fn().mockResolvedValue([{ statusCode: 202, headers: {} }]),
	},
}));

// Import after mocks
import { mailWorker } from "./mailWorker.js";

describe("Mail Worker", () => {
	beforeEach(() => {
		vi.mocked(sgMail.send).mockClear();
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

		expect(processor).not.toBeNull();

		if (!processor) {
			throw new Error("Worker processor was not registered");
		}

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

		vi.mocked(sgMail.send).mockRejectedValueOnce(new Error("SendGrid Failed"));

		const processor = getWorkerProcessor();

		expect(processor).not.toBeNull();

		if (!processor) {
			throw new Error("Worker processor was not registered");
		}

		await expect(processor(job)).rejects.toThrow("SendGrid Failed");
	});
});
