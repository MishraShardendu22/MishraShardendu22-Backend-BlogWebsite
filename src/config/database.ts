import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";

dotenv.config();
if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL environment variable is required");
}
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql);
