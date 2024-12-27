const { Users, Projects } = require('../models/Models');
const router = require('express').Router();
const isLoggedIn = require('../middleware/isAuth');
const fs = require('fs').promises;
const { check, validationResult } = require('express-validator');

router.get('/', async (req, res) => {
    const users = await Users.findAll();
    res.status(200).json({
        message: 'Here is users',
        users: users,
    });
});

router.get('/profile', isLoggedIn, async (req, res) => {
    try {
        const projects = await Projects.findAll({
            include: Users,
        });

        const requestsFromProjects = [];

        const createdProjects = projects.filter(
            project => project.creatorId === req.session.userId
        );

        if (createdProjects) {
            createdProjects.forEach(project => {
                const projectReqs = project.projectInfos?.projJoinRequests;
                if (projectReqs) {
                    projectReqs.forEach(rqst => {
                        requestsFromProjects.push(rqst);
                    });
                }
            });
        }

        const user = await Users.findOne({ where: { id: req.session.userId } });
        res.render('profile', {
            user: user,
            session: req.session,
            projects: projects,
            requests: requestsFromProjects || null,
            profilePic: user.profileImage,
            oldInput: {
                email: user.email,
                name: user.name,
                workingTitle: user.workingTitle,
            },
        });
    } catch (error) {
        console.trace(error);
        res.status(500).json({ errorMsg: error.message });
    }
});

// router.get join request oluştur her profil şayet proje ürettiyse projesine gelen katılım isteklerini görsün!!
router.get('/profile/join_requests', async (req, res) => {
    const userId = req.session.userId;
    const requestsFromProjects = [];

    try {
        // Kullanıcı tarafından oluşturulmuş projeleri getir.
        const createdProjects = await Projects.findAll({
            where: {
                creatorId: userId,
            },
        });

        if (createdProjects) {
            createdProjects.forEach(project => {
                const projectReqs = project.projectInfos.projJoinRequests;
                if (projectReqs) {
                    projectReqs.forEach(rqst => {
                        requestsFromProjects.push(rqst);
                    });
                }
            });
        }

        res.render('join-requests', {
            requests: requestsFromProjects || [],
        });
    } catch (error) {
        console.trace(error);
    }
});

router.post('/profile/join_request/:projectId', async (req, res) => {
    const projectId = req.params.projectId;
    try {
        // Find the user by session ID
        const requesterUser = await Users.findOne({
            where: { id: req.session.userId },
        });

        if (!requesterUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find the project by its ID
        const project = await Projects.findByPk(projectId);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const joinRequest = {
            requesterImage: requesterUser.profileImage,
            requesterName: requesterUser.name,
            requesterId: requesterUser.id,
            project: project.title,
            projectId: project.id,
        };

        // Parse projectInfos from the database
        const projJoinRequests = project.projectInfos.projJoinRequests || [];

        const requestersIds = project.projectInfos.requestersIds || [];

        const projectInfos = project.projectInfos;

        if (
            !projJoinRequests.some(req => req.requesterId === requesterUser.id)
        ) {
            projJoinRequests.push(joinRequest);

            requestersIds.push(requesterUser.id);

            projectInfos.projJoinRequests = projJoinRequests;
            projectInfos.requestersIds = requestersIds;

            // Update the projectInfos field explicitly
            await Projects.update(
                { projectInfos },
                { where: { id: projectId } }
            );

            res.status(200).json({
                message: 'Join request added successfully',
                projJoinRequests: projectInfos.projJoinRequests,
            });
        } else {
            res.status(400).json({
                message: 'User has already requested to join this project',
            });
        }
    } catch (error) {
        console.trace(error);
        res.status(500).json({ errorMsg: error.message });
    }
});

router.post('/profile/join-confirm/:projectId/:userId', async (req, res) => {
    const projectId = req.params.projectId;
    const joinRequesterId = req.params.userId;

    try {
        // Find the project by its ID
        const project = await Projects.findByPk(projectId);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Parse projectInfos and coworkers safely
        const projectInfos = project.projectInfos || {
            projJoinRequests: [],
            requestersIds: [],
        };
        const coworkers = project.coworkers || [];

        // Remove the join request from projJoinRequests
        projectInfos.projJoinRequests = projectInfos.projJoinRequests.filter(
            req => req.requesterId !== joinRequesterId
        );

        projectInfos.requestersIds = projectInfos.requestersIds.filter(
            id => id !== joinRequesterId
        );

        // Add the user to coworkers if not already present
        if (!coworkers.includes(joinRequesterId)) {
            const userDatas = await Users.findByPk(joinRequesterId);

            coworkers.push(joinRequesterId);

            // Update the projectInfos and coworkers fields in the database
            await Projects.update(
                { projectInfos, coworkers },
                { where: { id: projectId } }
            );

            return res.status(200);
        } else {
            return res.status(400).json({
                message: 'User is already a coworker in this project.',
            });
        }
    } catch (error) {
        console.trace(error);
        res.status(500).json({ errorMsg: error.message });
    }
});

// bunu düzelt bir türlü projectJoin requesti projecktınfodan silmiyor.
router.delete('/profile/join-deny/:projectId/:userId', async (req, res) => {
    const projectId = req.params.projectId;
    const joinRequesterId = req.params.userId;

    try {
        // Find the project by its ID
        const project = await Projects.findByPk(projectId);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Extract projectInfos and projJoinRequests safely
        const projectInfos = project.projectInfos || {};
        const projectJoinReqs = projectInfos.projJoinRequests || [];
        const requestersIds = projectInfos.requesterIds || [];

        // Filter out the request matching the userId
        const updatedJoinReqs = projectJoinReqs.filter(
            rqst => rqst.requesterId !== joinRequesterId
        );

        const updatedRequestersIds = requestersIds.filter(
            id => id !== joinRequesterId
        );

        // Update the projectInfos field
        projectInfos.projJoinRequests = updatedJoinReqs;
        projectInfos.requestersIds = updatedRequestersIds;

        await Projects.update({ projectInfos }, { where: { id: projectId } });

        res.status(200);
    } catch (error) {
        console.trace(error);
        res.status(500).json({ errorMsg: error.message });
    }
});

router.post('/profile/dismiss/:projectId', async (req, res) => {
    const projectId = req.params.projectId;
    try {
        // Find the user by session ID
        const user = await Users.findOne({ where: { id: req.session.userId } });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find the project by its ID
        const project = await Projects.findByPk(projectId);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const coworkers = project.coworkers || [];

        // Filter out the user ID from the coworkers array
        const updatedCoworkers = coworkers.filter(
            coworkerId => coworkerId !== user.id
        );

        // Update the project with the new coworkers array
        await Projects.update(
            { coworkers: updatedCoworkers },
            { where: { id: projectId } }
        );

        res.status(200).json({
            message: 'User has been removed from the project coworkers',
        });
    } catch (error) {
        console.trace(error);
        res.status(500).json({ errorMsg: error.message });
    }
});

router.post('/:userId/update', async (req, res, next) => {
    const projects = await Projects.findAll({
        include: Users,
    });
    const userId = req.params.userId;
    const user = await Users.findByPk(userId);
    const userEmail = req.body.email;
    const userName = req.body.name;
    const userWorkingTitle = req.body.workingTitle;
    const userPassword = req.body.password;
    const confirmPassword = req.body.confirmpassword;
    let profilePicPath;

    if (req.file) {
        await fs.unlink(user.profileImage);
        profilePicPath = req.file.path;
    } else {
        profilePicPath = user.profilePicture;
    }

    try {
        await user.update({
            name: userName,
            email: userEmail,
            workingTitle: userWorkingTitle,
            password: userPassword,
            profileImage: profilePicPath,
        });

        res.render('profile', {
            user: user,
            session: req.session,
            projects: projects,
            profilePic: user.profileImage,
            oldInput: {
                email: user.email,
                name: user.name,
                workingTitle: user.workingTitle,
                password: userPassword,
                confirmpassword: confirmPassword,
                profilePicture: profilePicPath,
            },
        });
    } catch (err) {
        console.trace(err);
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    }
});

module.exports = router;
