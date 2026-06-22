import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		exclude: ['node_modules', 'dist'],
		globals: true,
		env: {
			UPSTASH_REDIS_REST_URL: 'https://localhost',
			UPSTASH_REDIS_REST_TOKEN: 'mock_token',
			SENDGRID_API_KEY: 'SG.mock_key',
			OTP_EXPIRY_MINUTES: '10',
			JWT_SECRET: 'test_jwt_secret',
			OWNER_EMAIL: 'owner@example.com',
			PORTFOLIO_JWT_SECRET: 'test_portfolio_secret',
		},
	},
});
