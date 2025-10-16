import { relations } from "drizzle-orm/relations";
import { users, blog, comments, userProfiles } from "./schema";

export const blogRelations = relations(blog, ({one, many}) => ({
	user: one(users, {
		fields: [blog.authorId],
		references: [users.id]
	}),
	comments: many(comments),
}));

export const usersRelations = relations(users, ({many}) => ({
	blogs: many(blog),
	comments: many(comments),
	userProfiles: many(userProfiles),
}));

export const commentsRelations = relations(comments, ({one}) => ({
	user: one(users, {
		fields: [comments.userId],
		references: [users.id]
	}),
	blog: one(blog, {
		fields: [comments.blogId],
		references: [blog.id]
	}),
}));

export const userProfilesRelations = relations(userProfiles, ({one}) => ({
	user: one(users, {
		fields: [userProfiles.userId],
		references: [users.id]
	}),
}));