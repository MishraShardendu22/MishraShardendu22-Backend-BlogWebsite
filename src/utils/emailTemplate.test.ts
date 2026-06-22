import { describe, expect, it } from "vitest";
import { EmailTemplate } from "./emailTemplate.js";

describe("EmailTemplate", () => {
	it("should contain the recipient name and otp", () => {
		const html = EmailTemplate({ to_name: "John Doe", otp: "123456" });

		expect(html).toContain("John Doe");
		expect(html).toContain("123456");
	});

	it("should return a valid HTML string", () => {
		const html = EmailTemplate({ to_name: "Jane", otp: "987654" });

		expect(typeof html).toBe("string");
		expect(html.trim().startsWith("<")).toBe(true);
		expect(html.includes("background-color")).toBe(true);
	});
});
