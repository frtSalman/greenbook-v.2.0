const { Op } = require('sequelize');
const { Posts, Projects } = require('../models/Models');
const moment = require('moment');
const { setTimeout } = require('timers');
const fs = require('fs').promises;
const router = require('express').Router();

function getTodayDate() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
    const year = today.getFullYear();

    return `${day}.${month}.${year}`;
}

function reformatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
}

router.get('/:projectId', async (req, res) => {
    const projectId = req.params.projectId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const offset = (page - 1) * limit; // Offset for pagination

    try {
        // Use findAndCountAll to get posts and the total number of posts in one query
        const { rows: posts, count: total } = await Posts.findAndCountAll({
            where: { projectId }, // Filter by projectId
            limit, // Limit the number of posts per page
            offset, // Offset for pagination
            order: [['createdAt', 'DESC']], // Sort posts by the most recent (descending order)
        });

        const totalPages = Math.ceil(total / limit);

        // Render the posts page with pagination data
        res.render('posts/posts', {
            posts,
            currentPage: page,
            totalPages,
            limit,
            projectId,
        });
    } catch (error) {
        console.trace(error);
        res.status(500).send('An error occurred while fetching posts.');
    }
});

router.get('/:projectId/postSearch', async (req, res) => {
    const projectId = req.params.projectId;
    const dateQuery = req.query.searchDate;
    let query = {
        projectId: projectId,
        postDate: reformatDate(dateQuery),
    };

    try {
        const posts = await Posts.findAll({
            where: query,
            order: [['createdAt', 'DESC']],
        });
        res.render('posts/searchPosts', {
            posts,
            projectId,
        });
    } catch (error) {
        console.trace(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/create-post/:projectId', async (req, res) => {
    const projectId = req.params.projectId;
    try {
        const project = await Projects.findOne({
            where: { id: projectId },
        });

        res.render('posts/create-post', {
            project: project,
            username: req.session.name,
        });
    } catch (error) {
        console.trace(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/modal/:postId', async (req, res) => {
    const postId = req.params.postId;
    try {
        const post = await Posts.findOne({
            where: { id: postId },
            include: [
                {
                    model: Projects,
                    as: 'Project',
                },
            ],
        });

        if (!post) {
            return res.status(404).json({ error: 'Post or Project not found' });
        }

        const postGeoJSON = JSON.stringify(post.postGeoData);
        const projectCenter = post.Project.geoData.center;
        const centerJSON = JSON.stringify(projectCenter);
        const postPics = post.postImages;

        res.render('posts/post-detail', {
            post: post,
            projectId: post.Project.id,
            geoData: postGeoJSON,
            center: centerJSON,
            picArray: postPics,
        });
    } catch (error) {
        console.trace(error);
        res.status(500).json({ errorMsg: error.message });
    }
});

router.get('/geoData/:projectId', async (req, res) => {
    const projectId = req.params.projectId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    try {
        let query = { projectId };

        // Add date range criteria if startDate and endDate are provided
        if (startDate && endDate) {
            query['createdAt'] = {
                [Op.gte]: moment(startDate).startOf('day').toDate(), // Start of start date
                [Op.lte]: moment(endDate).endOf('day').toDate(), // End of end date
            };
        }

        const postGeoDatas = await Posts.findAll({
            where: query,
            attributes: ['postGeoData', 'id'], // return postGeoData , id field
            order: [['createdAt', 'DESC']],
            limit: 100, // Adjust the limit as per your requirement
        });

        res.json({ datas: postGeoDatas });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/update/:postId', async (req, res) => {
    const postId = req.params.postId;
    try {
        const post = await Posts.findOne({
            where: { id: postId },
        });
        res.render('posts/post-update', {
            post: post,
            username: req.session.name,
        });
    } catch (error) {
        console.trace(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/add-reply/:postId', async (req, res) => {
    const postId = req.params.postId;
    const reply = req.body.reply;
    const userName = req.session.name;

    try {
        const post = await Posts.findOne({ where: { id: postId } });

        if (reply === '') {
            return res.render('posts/post-replies', {
                replies: post.replies,
            });
        }

        // Assuming `replies` is a JSON field in Sequelize
        const newReply = { userName: userName, reply: reply };
        post.replies = [...post.replies, newReply];

        await post.save();
        res.render('posts/post-replies', {
            replies: post.replies,
        });
    } catch (error) {
        console.trace(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/photoUploads', async (req, res) => {
    try {
        if (req.file) {
            const photo = req.file;
            // Return the path to the client
            res.status(200).json({ postPhotoPath: photo.path });
        } else {
            throw new Error('No file uploaded');
        }
    } catch (error) {
        console.trace(error);
        if (postPhotoPaths.length > 0) {
            await Promise.all(
                postPhotoPaths.map(async path => {
                    try {
                        await fs.unlink(path);
                    } catch (err) {
                        console.error(`Error deleting file: ${path}`, err);
                    }
                })
            );
        }
        res.status(500).json({ errorMsg: error.message });
    }
});

router.post('/:projectId', async (req, res) => {
    try {
        const title = req.body.postTitle;
        const content = req.body.postContent;
        const kmStart = req.body.kmStart;
        const kmEnd = req.body.kmEnd;
        const userId = req.session.userId;
        const projectId = req.params.projectId; // Ensure this is a valid UUID
        const geoJsonData = req.body.geoData;
        const creatorName = req.session.name;
        const postPhotoPaths = JSON.parse(req.body.postPhotoPaths); // This should be an array of image paths

        let geoData;
        try {
            geoData = JSON.parse(geoJsonData);
        } catch (err) {
            console.warn(
                'Invalid geoJsonData input, proceeding without geoData.'
            );
            geoData = null; // Fallback in case JSON is invalid
        }

        const date = getTodayDate();

                await Posts.create({
                    title: title ,
                    content,
                    kmStart,
                    kmEnd,
                    creatorId: userId,
                    creatorName,
                    projectId, // Must be valid UUID
                    postGeoData: geoData,
                    postImages: postPhotoPaths, // Make sure this is the correct format (array of file paths)
                    postDate: date,
                });

        

        res.status(200).json({ message: 'Post created successfully' });
    } catch (error) {
        console.trace(error);
        res.status(500).json({ errorMsg: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    const id = req.params.id;

    try {
        await Posts.destroy({
            where: { id: id },
            individualHooks: true,
        });
        res.status(200).send({ message: 'Post deleted successfully', id });
    } catch (error) {
        console.trace(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/edit/:id', async (req, res) => {
    const id = req.params.id;
    const newTitle = req.body.postTitle;
    const newContent = req.body.postContent;
    const newKmStart = req.body.kmStart;
    const newKmEnd = req.body.kmEnd;
    const newGeoJsonData = req.body.updatedGeoData;
    const postPhotoPaths = JSON.parse(req.body.postPhotoPaths); // This should be an array of image paths

    let geoData;
    try {
        geoData = JSON.parse(newGeoJsonData);
    } catch (err) {
        console.warn('Invalid geoJsonData input, proceeding without geoData.');
        geoData = null; // Fallback in case JSON is invalid
    }

    const date = getTodayDate();

    try {
        const post = await Posts.findOne({ where: { id: id } });

        const oldPostImages = post.postImages;

        if (oldPostImages !== null) {
            oldPostImages.forEach(async ımgLink => {
                await fs.unlink(ımgLink);
            });
        }

        await post.update({
            title: newTitle,
            content: newContent,
            kmStart: newKmStart,
            kmEnd: newKmEnd,
            postGeoData: geoData,
            postImages: postPhotoPaths,
            postDate: date,
        });

        res.status(200).json({ message: 'Post updated successfully' });
    } catch (error) {
        console.trace(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
