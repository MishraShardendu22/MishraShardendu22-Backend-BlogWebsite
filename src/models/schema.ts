
import { users } from './authSchema'
import { pgTable, integer, varchar, text, timestamp } from 'drizzle-orm/pg-core'

export const blogTable = pgTable('blog', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  tags: text('tags').array(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  orderId: integer('order_id'),
  image: varchar('image', { length: 500 }),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const commentsTable = pgTable('comments', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  blogId: integer('blog_id')
    .notNull()
    .references(() => blogTable.id, { onDelete: 'cascade' }),
  content: varchar('content', { length: 500 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const userProfilesTable = pgTable('user_profiles', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  bio: text('bio'),
  avatar: varchar('avatar', { length: 500 }),
  website: varchar('website', { length: 255 }),
  location: varchar('location', { length: 100 }),
  dateOfBirth: timestamp('date_of_birth'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
