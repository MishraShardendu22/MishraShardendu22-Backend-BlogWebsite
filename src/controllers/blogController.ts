import { Request, Response } from 'express'
import { db } from '../config/database.js'
import { blogTable, userProfilesTable, commentsTable } from '../models/schema.js'
import { users as usersTable } from '../models/authSchema.js'
import { eq, like, and, or, count, sql, asc } from 'drizzle-orm'
import { cache } from '../utils/cache.js'


export async function getAllBlogs(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const tag = req.query.tag as string
    const author = req.query.author as string
    const search = req.query.search as string
    const offset = (page - 1) * limit

    // Create cache key based on query params
    const cacheKey = `blogs:${page}:${limit}:${tag || ''}:${author || ''}:${search || ''}`

    // Try to get from cache
    const cachedData = await cache.get(cacheKey)
    if (cachedData && typeof cachedData === 'string') {
      res.status(200).json(JSON.parse(cachedData))
      return
    }

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
    
    // Run blogs query and totalCount query concurrently for better performance
    const [blogs, totalCount] = await Promise.all([
      db
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
          comments: sql<number>`(
            SELECT COUNT(*)
            FROM ${commentsTable}
            WHERE ${commentsTable.blogId} = ${blogTable.id}
          )`.as('comments'),
        })
        .from(blogTable)
        .leftJoin(usersTable, eq(blogTable.authorId, usersTable.id))
        .leftJoin(userProfilesTable, eq(usersTable.id, userProfilesTable.userId))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(asc(blogTable.orderId)),
      db.select({ count: count() }).from(blogTable).where(whereClause)
    ])
    
    const total = totalCount[0]?.count || 0
    const response = {
      success: true,
      data: blogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }

    // Cache the response for 5 minutes
    await cache.set(cacheKey, response, 300)

    res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching blogs:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch blogs' })
  }
}

export async function getBlogById(req: Request, res: Response): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const blogId = parseInt(id)
    if (isNaN(blogId)) {
      res.status(400).json({ success: false, error: 'Invalid blog ID' })
      return
    }

    const cacheKey = `blog:${blogId}`

    // Try to get from cache
    const cachedData = await cache.get(cacheKey)
    if (cachedData && typeof cachedData === 'string') {
      res.status(200).json(JSON.parse(cachedData))
      return
    }
    
    // Run blog query and comments count query concurrently for better performance
    const [blog, commentsCount] = await Promise.all([
      db
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
        .where(eq(blogTable.id, blogId))
        .limit(1),
      db.select({ count: count() }).from(commentsTable).where(eq(commentsTable.blogId, blogId))
    ])
    
    if (blog.length === 0) {
      res.status(404).json({ success: false, error: 'Blog not found' })
      return
    }
    
    const blogWithCounts = {
      ...blog[0],
      image: blog[0].image,
      comments: commentsCount[0]?.count || 0,
    }

    const response = {
      success: true,
      data: blogWithCounts,
    }

    // Cache for 10 minutes
    await cache.set(cacheKey, response, 600)

    res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching blog:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch blog' })
  }
}

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
    // Calculate orderId as (current blog count + 1)
    const totalCountResult = await db.select({ count: count() }).from(blogTable);
    const orderId = (totalCountResult[0]?.count || 0) + 1;
    const [newBlog] = await db
      .insert(blogTable)
      .values({
        title,
        content,
        tags: tags || [],
        image: image || null,
        authorId: user.id,
        orderId,
      })
      .returning({
        id: blogTable.id,
        title: blogTable.title,
        content: blogTable.content,
        tags: blogTable.tags,
        image: blogTable.image,
        authorId: blogTable.authorId,
        orderId: blogTable.orderId,
        createdAt: blogTable.createdAt,
        updatedAt: blogTable.updatedAt,
      });

    // Invalidate blogs cache
    await cache.invalidatePattern('blogs:*')
    await cache.del('blog-stats')

    res.status(201).json({
      success: true,
      data: newBlog,
    });
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
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const blogId = parseInt(id)
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

    // Invalidate cache
    await cache.del(`blog:${blogId}`)
    await cache.invalidatePattern('blogs:*')
    await cache.del('blog-stats')

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
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const blogId = parseInt(id)
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

    // Invalidate cache
    await cache.del(`blog:${blogId}`)
    await cache.invalidatePattern('blogs:*')
    await cache.del('blog-stats')

    res.status(200).json({
      success: true,
      message: 'Blog deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting blog:', error)
    res.status(500).json({ success: false, error: 'Failed to delete blog' })
  }
}
