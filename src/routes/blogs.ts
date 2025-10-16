import { Router, IRouter } from 'express'
import * as blogController from '../controllers/blogController.js'
import * as commentController from '../controllers/commentController.js'
import * as statsController from '../controllers/statsController.js'
import { requireAuth, requireOwner } from '../middleware/auth.js'
import { getBlogsInOrder, reorderBlogs } from '../controllers/reorder.js'
const router: IRouter = Router()
router.get('/reorder', requireOwner, getBlogsInOrder)
router.get('/stats', statsController.getBlogStats)
router.get('/', blogController.getAllBlogs)
router.get('/:id', blogController.getBlogById)
router.post('/', requireOwner, blogController.createBlog)
router.post('/reorder', requireOwner, reorderBlogs)
router.put('/:id', requireOwner, blogController.updateBlog)
router.patch('/:id', requireOwner, blogController.updateBlog)
router.delete('/:id', requireOwner, blogController.deleteBlog)
router.get('/:id/comments', commentController.getCommentsByBlogId)
router.post('/:id/comments', requireAuth, commentController.createComment)
router.delete('/:id/comments/:commentId', requireAuth, commentController.deleteComment)
export default router
