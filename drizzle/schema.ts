import { pgTable, varchar, timestamp, foreignKey, integer, text, unique, serial, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const otpVerification = pgTable("otp_verification", {
	email: varchar({ length: 255 }).primaryKey().notNull(),
	otpHash: varchar("otp_hash", { length: 255 }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const blog = pgTable("blog", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "blog_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	tags: text().array(),
	title: varchar({ length: 255 }).notNull(),
	content: text().notNull(),
	authorId: integer("author_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	image: varchar({ length: 500 }),
	orderId: integer("order_id").generatedAlwaysAsIdentity({ name: "blog_order_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "blog_author_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const comments = pgTable("comments", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "comments_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	userId: integer("user_id").notNull(),
	blogId: integer("blog_id").notNull(),
	content: varchar({ length: 500 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "comments_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.blogId],
			foreignColumns: [blog.id],
			name: "comments_blog_id_blog_id_fk"
		}).onDelete("cascade"),
]);

export const userProfiles = pgTable("user_profiles", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "user_profiles_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	userId: integer("user_id").notNull(),
	firstName: varchar("first_name", { length: 100 }),
	lastName: varchar("last_name", { length: 100 }),
	bio: text(),
	avatar: varchar({ length: 500 }),
	website: varchar({ length: 255 }),
	location: varchar({ length: 100 }),
	dateOfBirth: timestamp("date_of_birth", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_profiles_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("user_profiles_user_id_unique").on(table.userId),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	email: text().notNull(),
	password: text().notNull(),
	name: text().notNull(),
	isVerified: boolean("is_verified").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	profileImage: varchar("profile_image", { length: 500 }),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);
