import { Request, Response } from 'express'
import { db } from '../config/database.js'
import { blogTable, commentsTable, userProfilesTable } from '../models/schema.js'
import { users as usersTable } from '../models/authSchema.js'
import { eq, count, desc, sql } from 'drizzle-orm'
/**
 * GET /api/blogs/stats
 * Get blog statistics for dashboard
 */
export async function getBlogStats(_req: Request, res: Response): Promise<void> {
  try {
    const [totalPosts, totalComments] = await Promise.all([
      db.select({ count: count() }).from(blogTable),
      db.select({ count: count() }).from(commentsTable),
    ])
    const recentPostsRaw = await db
      .select({
        id: blogTable.id,
        image: blogTable.image,
        title: blogTable.title,
        content: blogTable.content,
        tags: blogTable.tags,
        authorId: blogTable.authorId,
        createdAt: blogTable.createdAt,
        updatedAt: blogTable.updatedAt,
        authorEmail: usersTable.email,
        authorName: usersTable.name,
        firstName: userProfilesTable.firstName,
        lastName: userProfilesTable.lastName,
        avatar: userProfilesTable.avatar,
        profileImage: usersTable.profileImage,
      })
      .from(blogTable)
      .leftJoin(usersTable, eq(blogTable.authorId, usersTable.id))
      .leftJoin(userProfilesTable, eq(usersTable.id, userProfilesTable.userId))
      .orderBy(desc(blogTable.createdAt))
      .limit(5)
    const recentPosts = await Promise.all(
      recentPostsRaw.map(async (post: typeof recentPostsRaw[0]) => {
        const commentsCount = await db
          .select({ count: count() })
          .from(commentsTable)
          .where(eq(commentsTable.blogId, post.id))
        return {
          id: post.id,
          title: post.title,
          content: post.content,
          tags: post.tags || [],
          authorId: post.authorId,
          createdAt: post.createdAt?.toISOString() || '',
          updatedAt: post.updatedAt?.toISOString() || '',
          comments: commentsCount[0]?.count || 0,
          author: {
            id: post.authorId,
            email: post.authorEmail || '',
            name:
              post.firstName && post.lastName
                ? `${post.firstName} ${post.lastName}`
                : post.authorName || '',
            avatar: post.avatar || null,
            profileImage: post.profileImage ,
          },
          image: post.image,
        }
      })
    )
    const allTags = await db.select({ tags: blogTable.tags }).from(blogTable)
    const tagCounts: Record<string, number> = {}
    allTags.forEach((blog: { tags: string[] | null }) => {
      if (blog.tags) {
        blog.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        })
      }
    })
    const popularTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }))
    res.status(200).json({
      success: true,
      data: {
        totalPosts: totalPosts[0]?.count || 0,
        totalComments: totalComments[0]?.count || 0,
        recentPosts,
        popularTags,
      },
    })
  } catch (error) {
    console.error('Error fetching blog stats:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch blog statistics' })
  }
}
