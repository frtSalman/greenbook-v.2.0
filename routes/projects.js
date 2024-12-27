const { Users, Projects } = require('../models/Models');
const isAuth = require('../middleware/isAuth');
const isCoworkers = require('../middleware/isCoworkers');
const router = require('express').Router();
const apicache = require('apicache');
const fs = require('fs').promises;

const cache = apicache.middleware;

// Cache duration setting (e.g., 5 minutes)
const cacheDuration = '15 minutes';

router.get('/create-projects', isAuth, (req, res, next) => {
    try {
        const year = new Date().getFullYear();
        res.render('projects/create-projects', {
            username: req.session.name,
            year: year,
        });
    } catch (error) {
        console.trace(error);

        next(error);
    }
});

router.get(
    '/:projectId',
    isCoworkers,
    cache(cacheDuration, (req, res) => {
        const isUpdated = req.query.edit;
        if (isUpdated) {
            return false;
        }
    }),
    async (req, res) => {
        const projectId = req.params.projectId;
        const year = new Date().getFullYear();
        try {
            const project = await Projects.findByPk(projectId, {
                include: Users,
            });

            const coworkers =
                (await Users.findAll({
                    where: {
                        id: project.coworkers,
                    },
                    attributes: ['id', 'name', 'profileImage'], // Fetch only necessary fields
                })) || [];

            apicache.clear(`/${projectId}`);
            res.render('main', {
                project: project,
                coworkers,
                username: req.session.name,
                userID: req.session.userId,
                isUserAdmin:
                    req.session.userId === project.creatorId ? true : false,
                features: project.projectInfos,
                year: year,
            });
        } catch (error) {
            console.trace(error);
            res.status(500).json({ errorMsg: error.message });
        }
    }
);

router.get('/:projectId/project-detail', async (req, res) => {
    const projectId = req.params.projectId;
    const year = new Date().getFullYear();
    try {
        const project = await Projects.findOne({ where: { id: projectId } });

        res.render('projects/project-detail', {
            username: req.session.name,
            userId: req.session.userId,
            project: project,
            projectTitle: project.title,
            geoFeatures: project.geoData,
            features: project.projectInfos,
            year: year,
        });
    } catch (error) {
        console.trace(error);
        res.status(500).json({ errorMsg: error.message });
    }
});

router.get('/:projectId/projectCoords', async (req, res) => {
    const projectId = req.params.projectId;
    try {
        const project = await Projects.findOne({
            where: { id: projectId },
            include: Users,
        });

        if (!project || !project.geoData) {
            return res
                .status(404)
                .json({ message: 'Project or GeoData not found' });
        }

        const {
            center: clatLong,
            kmStart: kSlatLong,
            kmEnd: kElatLong,
            kgmCon: kgmlatLong,
            quarry: qlatLong,
            plent: platLong,
            kmlFileOnePath,
            kmlFileTwoPath,
            kmlFileThreePath,
            kmlFileFourPath,
            centerPic: centerPicLink,
            kmStartPic: kmStartPicLink,
            kmEndPic: kmEndPicLink,
            kgmConPic: kgmConPicLink,
            quarryPic: quarryPicLink,
            plentPic: plentPicLink,
        } = project.geoData;

        const creatorName = project.User.dataValues.name;

        res.json({
            cCoords: clatLong,
            kmSCoords: kSlatLong,
            kmECoords: kElatLong,
            kgmCoords: kgmlatLong,
            quarry: qlatLong,
            plent: platLong,
            kmlFileOnePath,
            kmlFileTwoPath,
            kmlFileThreePath,
            kmlFileFourPath,
            centerPicLink: centerPicLink,
            kmStartPicLink: kmStartPicLink,
            kmEndPicLink: kmEndPicLink,
            kgmConPicLink: kgmConPicLink,
            quarryPicLink: quarryPicLink,
            plentPicLink: plentPicLink,
            creatorName: creatorName,
        });
    } catch (error) {
        console.trace(error);
        res.status(500).json({ errorMsg: error.message });
    }
});

router.post('/', async (req, res, next) => {
    const userId = req.session.userId;
    const {
        projectTitle,
        extAmountCon,
        extAmountComp,
        fillAmountCon,
        fillAmountComp,
        pPAmountCon,
        pPAmountComp,
        bskAmountCon,
        bskAmountComp,
        skAmountCon,
        skAmountComp,
        cemAmountCon,
        cemAmountComp,
        rbrAmountCon,
        rbrAmountComp,
        bPAmountCon,
        bPAmountComp,
        sWAmountCon,
        sWAmountComp,
        cWAmountCon,
        cWAmountComp,
        cAmountCon,
        cAmountComp,
        rEAmountCon,
        rEAmountComp,
        tunnelAmountCon,
        tunnelAmountComp,
        bAmountCon,
        bAmountComp,
        trafficSignsAmountCon,
        trafficSignsAmountComp,
        quardRailAmountCon,
        quardRailAmountComp,
        landScapeAmountCon,
        landScapeAmountComp,
        drenAmountCon,
        drenAmountComp,
        elecAmountCon,
        elecAmountComp,
        netAmountCon,
        netAmountComp,
        sewerAmountCon,
        sewerAmountComp,
        projectLength,
        projectStandart,
        tenderLaw,
        tenderDate,
        tenderCost,
        priceCut,
        extraTenderCostPerc,
        extraTenderCostAm,
        totalTenderCost,
        projectStart,
        projectEnd,
        projectExtraDay,
        projectEndExtra,
        projectCost,
        projectCostLY,
        projectCostRest,
        allowCurrentYear,
        projectTransfers,
        revProgramAllow,
        workAmountConPrice,
        spendCurrentYear,
        wholeSpend,
        realization,
        workAhead,
        contractor,
        centerCoords,
        kmStart,
        kmEnd,
        kgmCon,
        quarry,
        plent,
    } = req.body;

    let centerImagePath,
        kmStartImagePath,
        kmEndImagePath,
        conImagePath,
        quarryImagePath,
        plentImagePath,
        kmlFileOnePath,
        kmlFileTwoPath,
        kmlFileThreePath,
        kmlFileFourPath;

    if (req.files['centerImage'])
        centerImagePath = req.files['centerImage'][0].path;
    if (req.files['kmStartImage'])
        kmStartImagePath = req.files['kmStartImage'][0].path;
    if (req.files['kmEndImage'])
        kmEndImagePath = req.files['kmEndImage'][0].path;
    if (req.files['conImage']) conImagePath = req.files['conImage'][0].path;
    if (req.files['quarryImage'])
        quarryImagePath = req.files['quarryImage'][0].path;
    if (req.files['plentImage'])
        plentImagePath = req.files['plentImage'][0].path;
    if (req.files['kmlFileOne'])
        kmlFileOnePath = req.files['kmlFileOne'][0].path;
    if (req.files['kmlFileTwo'])
        kmlFileTwoPath = req.files['kmlFileTwo'][0].path;
    if (req.files['kmlFileThree'])
        kmlFileThreePath = req.files['kmlFileThree'][0].path;
    if (req.files['kmlFileFour'])
        kmlFileFourPath = req.files['kmlFileFour'][0].path;

    // Convert coordinates to arrays
    const [clat, clong] = centerCoords.split(',');
    const [kSlat, kSlong] = kmStart.split(',');
    const [kElat, kElong] = kmEnd.split(',');
    const [kClat, kClong] = kgmCon.split(',');
    const [qlat, qlong] = quarry.split(',');
    const [plat, plong] = plent.split(',');

    // Project creation object
    const projectData = {
        title: projectTitle,
        creatorId: userId,
        geoData: {
            center: [clat, clong],
            centerPic: centerImagePath,
            kmStart: [kSlat, kSlong],
            kmStartPic: kmStartImagePath,
            kmEnd: [kElat, kElong],
            kmEndPic: kmEndImagePath,
            kgmCon: [kClat, kClong],
            kgmConPic: conImagePath,
            quarry: [qlat, qlong],
            quarryPic: quarryImagePath,
            plent: [plat, plong],
            plentPic: plentImagePath,
            kmlFileOnePath,
            kmlFileTwoPath,
            kmlFileThreePath,
            kmlFileFourPath,
        },
        projectInfos: {
            projectDetails: {
                projLength: projectLength,
                projStandart: projectStandart,
                projTenderLaw: tenderLaw,
                projTenderDate: tenderDate,
                projTenderCost: tenderCost,
                projPriceCut: priceCut,
                projETCPerc: extraTenderCostPerc,
                projETCAmount: extraTenderCostAm,
                projTTenderCost: totalTenderCost,
                projStartDate: projectStart,
                projEndDate: projectEnd,
                projExtraDay: projectExtraDay,
                projEndExtra: projectEndExtra,
                projCost: projectCost,
                projCostLY: projectCostLY,
                projCostRest: projectCostRest,
                projAllowCurYear: allowCurrentYear,
                projTransfers: projectTransfers,
                projRevProgramAllow: revProgramAllow,
                projWorkAmConPrice: workAmountConPrice,
                projSpenCurentYear: spendCurrentYear,
                projWholeSpend: wholeSpend,
                projRealization: realization,
                projWorkAhead: workAhead,
                projContractor: contractor,
            },
            projJoinRequests: [],
            requestersIds: [],
            earthWorks: {
                excavations: {
                    amountAtCon: extAmountCon,
                    amountComp: extAmountComp,
                },
                fillings: {
                    amountAtCon: fillAmountCon,
                    amountComp: fillAmountComp,
                },
            },
            asphaltPavements: {
                pmtPmat: {
                    amountAtCon: pPAmountCon,
                    amountComp: pPAmountComp,
                },
                bsk: {
                    amountAtCon: bskAmountCon,
                    amountComp: bskAmountComp,
                },
                sk: {
                    amountAtCon: skAmountCon,
                    amountComp: skAmountComp,
                },
            },
            artStructures: {
                cement: {
                    amountAtCon: cemAmountCon,
                    amountComp: cemAmountComp,
                },
                rebar: {
                    amountAtCon: rbrAmountCon,
                    amountComp: rbrAmountComp,
                },
                boredPile: {
                    amountAtCon: bPAmountCon,
                    amountComp: bPAmountComp,
                },
                stoneWall: {
                    amountAtCon: sWAmountCon,
                    amountComp: sWAmountComp,
                },
                concrateWall: {
                    amountAtCon: cWAmountCon,
                    amountComp: cWAmountComp,
                },
                culvert: {
                    amountAtCon: cAmountCon,
                    amountComp: cAmountComp,
                },
                reinforcedEarth: {
                    amountAtCon: rEAmountCon,
                    amountComp: rEAmountComp,
                },
                tunnel: {
                    amountAtCon: tunnelAmountCon,
                    amountComp: tunnelAmountComp,
                },
                bridge: {
                    amountAtCon: bAmountCon,
                    amountComp: bAmountComp,
                },
            },
            variousWorks: {
                trafficSigns: {
                    amountAtCon: trafficSignsAmountCon,
                    amountComp: trafficSignsAmountComp,
                },
                quardRail: {
                    amountAtCon: quardRailAmountCon,
                    amountComp: quardRailAmountComp,
                },
                landScape: {
                    amountAtCon: landScapeAmountCon,
                    amountComp: landScapeAmountComp,
                },
                dren: {
                    amountAtCon: drenAmountCon,
                    amountComp: drenAmountComp,
                },
                elec: {
                    amountAtCon: elecAmountCon,
                    amountComp: elecAmountComp,
                },
                net: {
                    amountAtCon: netAmountCon,
                    amountComp: netAmountComp,
                },
                sewer: {
                    amountAtCon: sewerAmountCon,
                    amountComp: sewerAmountComp,
                },
            },
        },
    };

    try {
        await Projects.create(projectData); // Create the project
        res.status(200).redirect('/users/profile'); // Redirect after successful creation
    } catch (error) {
        console.trace(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.delete('/:projectId', async (req, res) => {
    const id = req.params.projectId;

    try {
        const deletedProject = await Projects.destroy({
            where: { id: id },
            individualHooks: true,
        });

        if (deletedProject) {
            res.status(200).send({
                message: 'Project deleted successfully',
                id,
            });
        } else {
            res.status(404).send({ message: 'Project not found' });
        }
    } catch (error) {
        console.trace(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/:projectId/edit', async (req, res, next) => {
    const projectId = req.params.projectId;
    try {
        const project = await Projects.findOne({ where: { id: projectId } });
        if (!project) {
            return res.status(404).send({ message: 'Project not found' });
        }
        const {
            projectTitle,
            extAmountCon,
            extAmountComp,
            fillAmountCon,
            fillAmountComp,
            pPAmountCon,
            pPAmountComp,
            bskAmountCon,
            bskAmountComp,
            skAmountCon,
            skAmountComp,
            cemAmountCon,
            cemAmountComp,
            rbrAmountCon,
            rbrAmountComp,
            bPAmountCon,
            bPAmountComp,
            sWAmountCon,
            sWAmountComp,
            cWAmountCon,
            cWAmountComp,
            cAmountCon,
            cAmountComp,
            rEAmountCon,
            rEAmountComp,
            tunnelAmountCon,
            tunnelAmountComp,
            bAmountCon,
            bAmountComp,
            trafficSignsAmountCon,
            trafficSignsAmountComp,
            quardRailAmountCon,
            quardRailAmountComp,
            landScapeAmountCon,
            landScapeAmountComp,
            drenAmountCon,
            drenAmountComp,
            elecAmountCon,
            elecAmountComp,
            netAmountCon,
            netAmountComp,
            sewerAmountCon,
            sewerAmountComp,
            projectLength,
            projectStandart,
            tenderLaw,
            tenderDate,
            tenderCost,
            priceCut,
            extraTenderCostPerc,
            extraTenderCostAm,
            totalTenderCost,
            projectStart,
            projectEnd,
            projectExtraDay,
            projectEndExtra,
            projectCost,
            projectCostLY,
            projectCostRest,
            allowCurrentYear,
            projectTransfers,
            revProgramAllow,
            workAmountConPrice,
            spendCurrentYear,
            wholeSpend,
            realization,
            workAhead,
            contractor,
            centerCoords,
            kmStart,
            kmEnd,
            kgmCon,
            quarry,
            plent,
        } = req.body;

        let centerImagePath,
            kmStartImagePath,
            kmEndImagePath,
            conImagePath,
            quarryImagePath,
            plentImagePath,
            kmlFileOnePath,
            kmlFileTwoPath,
            kmlFileThreePath,
            kmlFileFourPath;

        /* Eğer herhangi bir yeni belge varsa eski belgeyi sil.*/

        if (req.files['centerImage']) {
            if (project.geoData.centerPic !== undefined) {
                await fs.unlink(project.geoData.centerPic);
            }
            centerImagePath = req.files['centerImage'][0].path;
        } else {
            centerImagePath = project.geoData.centerPic;
        }

        if (req.files['kmStartImage']) {
            if (project.geoData.kmStartPic !== undefined) {
                await fs.unlink(project.geoData.kmStartPic);
            }
            kmStartImagePath = req.files['kmStartImage'][0].path;
        } else {
            kmStartImagePath = project.geoData.kmStartPic;
        }

        if (req.files['kmEndImage']) {
            if (project.geoData.kmEndPic !== undefined) {
                await fs.unlink(project.geoData.kmEndPic);
            }
            kmEndImagePath = req.files['kmEndImage'][0].path;
        } else {
            kmEndImagePath = project.geoData.kmEndPic;
        }

        if (req.files['conImage']) {
            if (project.geoData.kmConPic !== undefined) {
                await fs.unlink(project.geoData.kmConPic);
            }
            conImagePath = req.files['conImage'][0].path;
        } else {
            conImagePath = project.geoData.kgmConPic;
        }

        if (req.files['quarryImage']) {
            if (project.geoData.quarryPic !== undefined) {
                await fs.unlink(project.geoData.quarryPic);
            }
            quarryImagePath = req.files['quarryImage'][0].path;
        } else {
            quarryImagePath = project.geoData.quarryPic;
        }

        if (req.files['plentImage']) {
            if (project.geoData.plentPic !== undefined) {
                await fs.unlink(project.geoData.plentPic);
            }
            plentImagePath = req.files['plentImage'][0].path;
        } else {
            plentImagePath = project.geoData.plentPic;
        }

        if (req.files['kmlFileOne']) {
            if (project.geoData.kmlFileOnePath !== undefined) {
                await fs.unlink(project.geoData.kmlFileOnePath);
            }
            kmlFileOnePath = req.files['kmlFileOne'][0].path;
        } else {
            kmlFileOnePath = project.geoData.kmlFileOnePath;
        }

        if (req.files['kmlFileTwo']) {
            if (project.geoData.kmlFileTwoPath !== undefined) {
                await fs.unlink(project.geoData.kmlFileTwoPath);
            }
            kmlFileTwoPath = req.files['kmlFileTwo'][0].path;
        } else {
            kmlFileTwoPath = project.geoData.kmlFileTwoPath;
        }

        if (req.files['kmlFileThree']) {
            if (project.geoData.kmlFileThreePath !== undefined) {
                await fs.unlink(project.geoData.kmlFileThreePath);
            }
            kmlFileThreePath = req.files['kmlFileThree'][0].path;
        } else {
            kmlFileThreePath = project.geoData.kmlFileThreePath;
        }

        if (req.files['kmlFileFour']) {
            if (project.geoData.kmlFileFourPath !== undefined) {
                await fs.unlink(project.geoData.kmlFileFourPath);
            }
            kmlFileFourPath = req.files['kmlFileFour'][0].path;
        } else {
            kmlFileFourPath = project.geoData.kmlFileFourPath;
        }

        // Convert coordinates to arrays
        const [clat, clong] = centerCoords.split(',');
        const [kSlat, kSlong] = kmStart.split(',');
        const [kElat, kElong] = kmEnd.split(',');
        const [kClat, kClong] = kgmCon.split(',');
        const [qlat, qlong] = quarry.split(',');
        const [plat, plong] = plent.split(',');

        // Project creation object
        await project.update({
            title: projectTitle,
            geoData: {
                center: [clat, clong],
                centerPic: centerImagePath,
                kmStart: [kSlat, kSlong],
                kmStartPic: kmStartImagePath,
                kmEnd: [kElat, kElong],
                kmEndPic: kmEndImagePath,
                kgmCon: [kClat, kClong],
                kgmConPic: conImagePath,
                quarry: [qlat, qlong],
                quarryPic: quarryImagePath,
                plent: [plat, plong],
                plentPic: plentImagePath,
                kmlFileOnePath,
                kmlFileTwoPath,
                kmlFileThreePath,
                kmlFileFourPath,
            },
            projectInfos: {
                projectDetails: {
                    projLength: projectLength,
                    projStandart: projectStandart,
                    projTenderLaw: tenderLaw,
                    projTenderDate: tenderDate,
                    projTenderCost: tenderCost,
                    projPriceCut: priceCut,
                    projETCPerc: extraTenderCostPerc,
                    projETCAmount: extraTenderCostAm,
                    projTTenderCost: totalTenderCost,
                    projStartDate: projectStart,
                    projEndDate: projectEnd,
                    projExtraDay: projectExtraDay,
                    projEndExtra: projectEndExtra,
                    projCost: projectCost,
                    projCostLY: projectCostLY,
                    projCostRest: projectCostRest,
                    projAllowCurYear: allowCurrentYear,
                    projTransfers: projectTransfers,
                    projRevProgramAllow: revProgramAllow,
                    projWorkAmConPrice: workAmountConPrice,
                    projSpenCurentYear: spendCurrentYear,
                    projWholeSpend: wholeSpend,
                    projRealization: realization,
                    projWorkAhead: workAhead,
                    projContractor: contractor,
                },
                earthWorks: {
                    excavations: {
                        amountAtCon: extAmountCon,
                        amountComp: extAmountComp,
                    },
                    fillings: {
                        amountAtCon: fillAmountCon,
                        amountComp: fillAmountComp,
                    },
                },
                asphaltPavements: {
                    pmtPmat: {
                        amountAtCon: pPAmountCon,
                        amountComp: pPAmountComp,
                    },
                    bsk: {
                        amountAtCon: bskAmountCon,
                        amountComp: bskAmountComp,
                    },
                    sk: {
                        amountAtCon: skAmountCon,
                        amountComp: skAmountComp,
                    },
                },
                artStructures: {
                    cement: {
                        amountAtCon: cemAmountCon,
                        amountComp: cemAmountComp,
                    },
                    rebar: {
                        amountAtCon: rbrAmountCon,
                        amountComp: rbrAmountComp,
                    },
                    boredPile: {
                        amountAtCon: bPAmountCon,
                        amountComp: bPAmountComp,
                    },
                    stoneWall: {
                        amountAtCon: sWAmountCon,
                        amountComp: sWAmountComp,
                    },
                    concrateWall: {
                        amountAtCon: cWAmountCon,
                        amountComp: cWAmountComp,
                    },
                    culvert: {
                        amountAtCon: cAmountCon,
                        amountComp: cAmountComp,
                    },
                    reinforcedEarth: {
                        amountAtCon: rEAmountCon,
                        amountComp: rEAmountComp,
                    },
                    tunnel: {
                        amountAtCon: tunnelAmountCon,
                        amountComp: tunnelAmountComp,
                    },
                    bridge: {
                        amountAtCon: bAmountCon,
                        amountComp: bAmountComp,
                    },
                },
                variousWorks: {
                    trafficSigns: {
                        amountAtCon: trafficSignsAmountCon,
                        amountComp: trafficSignsAmountComp,
                    },
                    quardRail: {
                        amountAtCon: quardRailAmountCon,
                        amountComp: quardRailAmountComp,
                    },
                    landScape: {
                        amountAtCon: landScapeAmountCon,
                        amountComp: landScapeAmountComp,
                    },
                    dren: {
                        amountAtCon: drenAmountCon,
                        amountComp: drenAmountComp,
                    },
                    elec: {
                        amountAtCon: elecAmountCon,
                        amountComp: elecAmountComp,
                    },
                    net: {
                        amountAtCon: netAmountCon,
                        amountComp: netAmountComp,
                    },
                    sewer: {
                        amountAtCon: sewerAmountCon,
                        amountComp: sewerAmountComp,
                    },
                },
            },
        });
        return res
            .status(200)
            .redirect('/projects/' + projectId + '?edit=true');
    } catch (error) {
        console.trace(error);
        next(error);
    }
});

router.post('/kick-cowoker/:projectId/:coworkerId', async (req, res) => {
    const projectId = req.params.projectId;
    const coworkerId = req.params.coworkerId;

    try {
        const project = await Projects.findByPk(projectId);

        const updatedCoworkers = project.coworkers.filter(
            id => id !== coworkerId
        );

        await Projects.update(
            { coworkers: updatedCoworkers },
            { where: { id: projectId } }
        );
        res.status(200);
    } catch (error) {
        console.trace(error);
    }
});

module.exports = router;
