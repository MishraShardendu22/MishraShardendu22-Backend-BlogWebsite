import { Request, Response } from 'express'
import { db } from '../config/database.js'
import { blogTable, userProfilesTable, commentsTable } from '../models/schema.js'
import { users as usersTable } from '../models/authSchema.js'
import { eq, desc, like, and, or, count, sql } from 'drizzle-orm'


export async function getAllBlogs(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const tag = req.query.tag as string
    const author = req.query.author as string
    const search = req.query.search as string
    const offset = (page - 1) * limit
    const conditions = []
    if (tag) {
      conditions.push(sql`${blogTable.tags} @> ARRAY[${tag}]::text[]`)
    }
    if (search) {
      conditions.push(
        or(
          like(blogTable.title, `%${search}%`),
          like(blogTable.content, `%${search}%`)
        )
      )
    }
    if (author) {
      const authorId = parseInt(author)
      if (!isNaN(authorId)) {
        conditions.push(eq(blogTable.authorId, authorId))
      }
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined
    const blogs = await db
      .select({
        id: blogTable.id,
        title: blogTable.title,
        image: blogTable.image,
        content: blogTable.content,
        tags: blogTable.tags,
        authorId: blogTable.authorId,
        createdAt: blogTable.createdAt,
        updatedAt: blogTable.updatedAt,
        author: {
          id: usersTable.id,
          email: usersTable.email,
          name: usersTable.name,
          image: usersTable.profileImage
        },
        authorProfile: {
          firstName: userProfilesTable.firstName,
          lastName: userProfilesTable.lastName,
          avatar: userProfilesTable.avatar,
        },
      })
      .from(blogTable)
      .leftJoin(usersTable, eq(blogTable.authorId, usersTable.id))
      .leftJoin(userProfilesTable, eq(usersTable.id, userProfilesTable.userId))
      .where(whereClause)
      .orderBy(desc(blogTable.createdAt))
      .limit(limit)
      .offset(offset)
    const blogsWithCounts = await Promise.all(
      blogs.map(async (blog: typeof blogs[0]) => {
        const [commentsCount] = await Promise.all([
          db
            .select({ count: count() })
            .from(commentsTable)
            .where(eq(commentsTable.blogId, blog.id)),
        ])
        return {
          ...blog,
          comments: commentsCount[0]?.count || 0,
        }
      })
    )
    const totalCount = await db.select({ count: count() }).from(blogTable).where(whereClause)
    res.status(200).json({
      success: true,
      data: blogsWithCounts,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching blogs:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch blogs' })
  }
}
/**
 * GET /api/blogs/:id
 * Get a single blog by ID
 */
export async function getBlogById(req: Request, res: Response): Promise<void> {
  try {
    const blogId = parseInt(req.params.id)
    if (isNaN(blogId)) {
      res.status(400).json({ success: false, error: 'Invalid blog ID' })
      return
    }
    const blog = await db
      .select({
        id: blogTable.id,
        title: blogTable.title,
        image: blogTable.image,
        content: blogTable.content,
        tags: blogTable.tags,
        authorId: blogTable.authorId,
        createdAt: blogTable.createdAt,
        updatedAt: blogTable.updatedAt,
        author: {
          id: usersTable.id,
          email: usersTable.email,
          name: usersTable.name,
        },
        authorProfile: {
          firstName: userProfilesTable.firstName,
          lastName: userProfilesTable.lastName,
          avatar: userProfilesTable.avatar,
        },
      })
      .from(blogTable)
      .leftJoin(usersTable, eq(blogTable.authorId, usersTable.id))
      .leftJoin(userProfilesTable, eq(usersTable.id, userProfilesTable.userId))
      .where(eq(blogTable.id, blogId))
      .limit(1)
    if (blog.length === 0) {
      res.status(404).json({ success: false, error: 'Blog not found' })
      return
    }
    const [commentsCount] = await Promise.all([
      db.select({ count: count() }).from(commentsTable).where(eq(commentsTable.blogId, blogId)),
    ])
    const blogWithCounts = {
      ...blog[0],
      image: blog[0].image,
      comments: commentsCount[0]?.count || 0,
    }
    res.status(200).json({
      success: true,
      data: blogWithCounts,
    })
  } catch (error) {
    console.error('Error fetching blog:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch blog' })
  }
}
/**
 * POST /api/blogs
 * Create a new blog (owner only)
 */
export async function createBlog(req: Request, res: Response): Promise<void> {
  try {
  const { title, content, tags, image } = req.body
    const user = req.user!
    if (!title || !content) {
      res.status(400).json({ success: false, error: 'Title and content are required' })
      return
    }
    // Require thumbnail image URL
    if (!image) {
      res.status(400).json({ success: false, error: 'Thumbnail image URL (image) is required' })
      return
    }
    // Validate image URL
    try {
      // eslint-disable-next-line no-new
      new URL(image)
    } catch (err) {
      res.status(400).json({ success: false, error: 'Invalid image URL' })
      return
    }
    const [newBlog] = await db
      .insert(blogTable)
      .values({
        title,
        content,
        tags: tags || [],
        image: image || null,
        authorId: user.id,
      })
      .returning({
        id: blogTable.id,
        title: blogTable.title,
        content: blogTable.content,
        tags: blogTable.tags,
        image: blogTable.image,
        authorId: blogTable.authorId,
        createdAt: blogTable.createdAt,
        updatedAt: blogTable.updatedAt,
      })
    res.status(201).json({
      success: true,
      data: newBlog,
    })
  } catch (error) {
    console.error('Error creating blog:', error)
    res.status(500).json({ success: false, error: 'Failed to create blog' })
  }
}
/**
 * PATCH /api/blogs/:id or PUT /api/blogs/:id
 * Update a blog (owner only)
 */
export async function updateBlog(req: Request, res: Response): Promise<void> {
  try {
    const blogId = parseInt(req.params.id)
  const { title, content, tags, image } = req.body
    if (isNaN(blogId)) {
      res.status(400).json({ success: false, error: 'Invalid blog ID' })
      return
    }
    const existingBlog = await db.select().from(blogTable).where(eq(blogTable.id, blogId)).limit(1)
    if (existingBlog.length === 0) {
      res.status(404).json({ success: false, error: 'Blog not found' })
      return
    }
    // If image is provided, validate URL
    if (image !== undefined && image !== null) {
      try {
        // eslint-disable-next-line no-new
        new URL(image)
      } catch (err) {
        res.status(400).json({ success: false, error: 'Invalid image URL' })
        return
      }
    }

    const [updatedBlog] = await db
      .update(blogTable)
      .set({
        title: title || existingBlog[0].title,
        content: content || existingBlog[0].content,
        tags: tags || existingBlog[0].tags,
        image: image !== undefined ? image : existingBlog[0].image,
        updatedAt: new Date(),
      })
      .where(eq(blogTable.id, blogId))
      .returning({
        id: blogTable.id,
        title: blogTable.title,
        content: blogTable.content,
        tags: blogTable.tags,
        image: blogTable.image,
        authorId: blogTable.authorId,
        createdAt: blogTable.createdAt,
        updatedAt: blogTable.updatedAt,
      })
    res.status(200).json({
      success: true,
      data: updatedBlog,
    })
  } catch (error) {
    console.error('Error updating blog:', error)
    res.status(500).json({ success: false, error: 'Failed to update blog' })
  }
}
/**
 * DELETE /api/blogs/:id
 * Delete a blog (owner only)
 */
export async function deleteBlog(req: Request, res: Response): Promise<void> {
  try {
    const blogId = parseInt(req.params.id)
    if (isNaN(blogId)) {
      res.status(400).json({ success: false, error: 'Invalid blog ID' })
      return
    }
    const existingBlog = await db.select().from(blogTable).where(eq(blogTable.id, blogId)).limit(1)
    if (existingBlog.length === 0) {
      res.status(404).json({ success: false, error: 'Blog not found' })
      return
    }
    await db.delete(blogTable).where(eq(blogTable.id, blogId))
    res.status(200).json({
      success: true,
      message: 'Blog deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting blog:', error)
    res.status(500).json({ success: false, error: 'Failed to delete blog' })
  }
}
