const { Projects } = require('../models/Models');

module.exports = async (req, res, next) => {
    const projectId = req.params.projectId;
    const project = await Projects.findByPk(projectId);
    if (!project.coworkers.includes(req.session.userId)) {
        return res.redirect('/users/profile');
    }
    next();
};
