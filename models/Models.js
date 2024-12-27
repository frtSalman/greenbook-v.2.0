const { DataTypes, Op } = require('sequelize');
const db = require('../util/database');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;

let Users;

// Define Posts model
const Posts = db.define(
    'Post',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        kmStart: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        kmEnd: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        postGeoData: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        postDate: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        postImages: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true,
            defaultValue: [],
        },
        creatorName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        creatorId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        projectId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        replies: {
            type: DataTypes.ARRAY(DataTypes.JSONB),
            allowNull: true,
            defaultValue: [],
        },
    },
    {
        hooks: {
            beforeDestroy: async (post, options) => {
                post.postImages.forEach(imagePath => {
                    if (imagePath) {
                        fs.unlink(imagePath, err => {
                            if (err) {
                                console.error(
                                    `Error deleting file: ${imagePath}`,
                                    err
                                );
                            } else {
                                console.log(`Deleted file: ${imagePath}`);
                            }
                        });
                    }
                });
            },
        },
        tableName: 'posts', // Explicit table name
    }
);

// Define Projects model
const Projects = db.define(
    'Project',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        geoData: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        projectInfos: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        creatorId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        coworkers: {
            type: DataTypes.ARRAY(DataTypes.UUID),
            allowNull: true,
        },
    },
    {
        hooks: {
            beforeSave: async project => {
                if (!project.coworkers || project.coworkers.length === 0) {
                    project.coworkers = [project.creatorId];
                }
                project.UserId = project.creatorId;
            },
            beforeDestroy: async (project, options) => {
                const posts = await Posts.findAll({
                    where: { projectId: project.id },
                });
                for (const post of posts) {
                    if (post.postImages && post.postImages.length > 0) {
                        for (const imagePath of post.postImages) {
                            if (imagePath) {
                                await fs.unlink(imagePath).catch(err => {
                                    console.error(
                                        `Error deleting file: ${imagePath}`,
                                        err
                                    );
                                });
                            }
                        }
                    }
                }
                const imagePaths = [
                    project.geoData.centerPic,
                    project.geoData.kmStartPic,
                    project.geoData.kmEndPic,
                    project.geoData.kgmConPic,
                    project.geoData.quarryPic,
                    project.geoData.plentPic,
                    project.geoData.kmlFilePath,
                ];
                imagePaths.forEach(async imagePath => {
                    if (imagePath) {
                        await fs.unlink(imagePath, err => {
                            if (err) {
                                console.error(
                                    `Error deleting file: ${imagePath}`,
                                    err
                                );
                            } else {
                                console.log(`Deleted file: ${imagePath}`);
                            }
                        });
                    }
                });
            },
        },
        tableName: 'projects', // Explicit table name
    }
);

// Define Users model
Users = db.define(
    'User',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        workingTitle: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        profileImage: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        isAdmin: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    },
    {
        hooks: {
            beforeSave: async user => {
                if (user.password) {
                    console.trace(user.password);
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
        },
        tableName: 'users', // Explicit table name
    }
);

// Define associations
Projects.hasMany(Posts, {
    foreignKey: { name: 'projectId', type: DataTypes.UUID },
});
Posts.belongsTo(Projects, { foreignKey: 'projectId', onDelete: 'CASCADE' });

Users.hasMany(Projects, {
    foreignKey: { name: 'creatorId', type: DataTypes.UUID },
});
Projects.belongsTo(Users);

module.exports = { Posts, Projects, Users };
