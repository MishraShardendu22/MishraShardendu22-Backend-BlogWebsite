import { Request, Response } from 'express'
import { db } from '../config/database.js'
import { commentsTable, blogTable, userProfilesTable } from '../models/schema.js'
import { users as usersTable } from '../models/authSchema.js'
import { eq, desc, and, count } from 'drizzle-orm'

export async function getCommentsByBlogId(req: Request, res: Response): Promise<void> {
  try {
    const blogId = parseInt(req.params.id)
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const offset = (page - 1) * limit
    if (isNaN(blogId)) {
      res.status(400).json({ success: false, error: 'Invalid blog ID' })
      return
    }
    const blog = await db.select().from(blogTable).where(eq(blogTable.id, blogId)).limit(1)
    if (blog.length === 0) {
      res.status(404).json({ success: false, error: 'Blog not found' })
      return
    }
    const comments = await db
      .select({
        id: commentsTable.id,
        content: commentsTable.content,
        userId: commentsTable.userId,
        blogId: commentsTable.blogId,
        createdAt: commentsTable.createdAt,
        user: {
          id: usersTable.id,
          email: usersTable.email,
          name: usersTable.name,
          isVerified: usersTable.isVerified,
          profileImage: usersTable.profileImage,
        },
        userProfile: {
          firstName: userProfilesTable.firstName,
          lastName: userProfilesTable.lastName,
          avatar: userProfilesTable.avatar,
        },
      })
      .from(commentsTable)
      .leftJoin(usersTable, eq(commentsTable.userId, usersTable.id))
      .leftJoin(userProfilesTable, eq(usersTable.id, userProfilesTable.userId))
      .where(eq(commentsTable.blogId, blogId))
      .orderBy(desc(commentsTable.createdAt))
      .limit(limit)
      .offset(offset)
    const totalCount = await db
      .select({ count: count() })
      .from(commentsTable)
      .where(eq(commentsTable.blogId, blogId))
    res.status(200).json({
      success: true,
      data: comments,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching comments:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch comments' })
  }
}
/**
 * POST /api/blogs/:id/comments
 * Create a new comment (authenticated and verified users only)
 */
export async function createComment(req: Request, res: Response): Promise<void> {
  try {
    const blogId = parseInt(req.params.id)
    const { content } = req.body
    const user = req.user!
    if (isNaN(blogId)) {
      res.status(400).json({ success: false, error: 'Invalid blog ID' })
      return
    }
    if (!content) {
      res.status(400).json({ success: false, error: 'Content is required' })
      return
    }

    // Check if user is verified
    const [userRecord] = await db
      .select({ isVerified: usersTable.isVerified })
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .limit(1)

    if (!userRecord || !userRecord.isVerified) {
      res.status(403).json({
        success: false,
        error: 'Please verify your email to post comments',
        requiresVerification: true,
      })
      return
    }

    const blog = await db.select().from(blogTable).where(eq(blogTable.id, blogId)).limit(1)
    if (blog.length === 0) {
      res.status(404).json({ success: false, error: 'Blog not found' })
      return
    }
    const [newComment] = await db
      .insert(commentsTable)
      .values({
        content,
        userId: user.id,
        blogId,
      })
      .returning({
        id: commentsTable.id,
        content: commentsTable.content,
        userId: commentsTable.userId,
        blogId: commentsTable.blogId,
        createdAt: commentsTable.createdAt,
      })
    // Fetch user info to include profileImage in the response
    const [userInfo] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, profileImage: usersTable.profileImage })
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .limit(1)

    res.status(201).json({
      success: true,
      data: {
        ...newComment,
        user: userInfo || null,
      },
    })
  } catch (error) {
    console.error('Error creating comment:', error)
    res.status(500).json({ success: false, error: 'Failed to create comment' })
  }
}
/**
 * DELETE /api/blogs/:id/comments/:commentId
 * Delete a comment (comment author or blog owner)
 */
export async function deleteComment(req: Request, res: Response): Promise<void> {
  try {
    const blogId = parseInt(req.params.id)
    const commentId = parseInt(req.params.commentId)
    const user = req.user!
    if (isNaN(blogId) || isNaN(commentId)) {
      res.status(400).json({ success: false, error: 'Invalid blog ID or comment ID' })
      return
    }
    const blog = await db.select().from(blogTable).where(eq(blogTable.id, blogId)).limit(1)
    if (blog.length === 0) {
      res.status(404).json({ success: false, error: 'Blog not found' })
      return
    }
    const [comment] = await db
      .select({
        id: commentsTable.id,
        userId: commentsTable.userId,
      })
      .from(commentsTable)
      .where(and(eq(commentsTable.id, commentId), eq(commentsTable.blogId, blogId)))
      .limit(1)
    if (!comment) {
      res.status(404).json({ success: false, error: 'Comment not found' })
      return
    }
    const isCommentAuthor = comment.userId === user.id
    const isOwner = user.isOwner
    if (!isCommentAuthor && !isOwner) {
      res.status(403).json({
        success: false,
        error: 'Forbidden - You can only delete your own comments or if you are the blog owner',
      })
      return
    }
    await db.delete(commentsTable).where(eq(commentsTable.id, commentId))
    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting comment:', error)
    res.status(500).json({ success: false, error: 'Failed to delete comment' })
  }
}
