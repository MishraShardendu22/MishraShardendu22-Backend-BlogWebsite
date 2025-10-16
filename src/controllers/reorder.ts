import { sql } from 'drizzle-orm';
import { db } from '../config/database.js'
import { Request, Response } from 'express'
import { blogTable } from '../models/schema.js'


interface ReorderRequestBody {
    blogId_Old : number;
    blogId_New : number;
}

export async function reorderBlogs(req: Request, res: Response): Promise<void> {
    try {
        const data = req.body as { data: ReorderRequestBody[] };

        console.log('Reorder request data:', data);

        if (!Array.isArray(data) || data.length === 0) {
            res.status(400).json({ success: false, error: 'Invalid request body' });
            return;
        }

        for (const { id, blogId_New } of data) {
            if (isNaN(id) || isNaN(blogId_New)) {
                res.status(400).json({ success: false, error: 'Invalid blog IDs' });
                return;
            }
            await db.execute(sql`UPDATE ${blogTable} SET order_id = ${blogId_New} WHERE id = ${id}`);

        }

        res.status(200).json({ success: true, message: 'Blogs reordered successfully' });
        return;
    } catch (error) {
        console.error('Reorder blogs error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

export async function getBlogsInOrder(req: Request, res: Response): Promise<void> {
    try {
        const blogs = await db.select({ orderId: blogTable.orderId, title: blogTable.title }).from(blogTable).orderBy(sql`${blogTable.orderId} ASC`);
        res.status(200).json({ success: true, data: blogs });
        return;
    } catch (error) {
        console.error('Error fetching blogs in order:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch blogs in order' });
    }
}