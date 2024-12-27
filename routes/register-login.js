const { Users } = require('../models/Models');
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const isLoggedIn = require('../middleware/isLoggedIn');
const router = require('express').Router();
const nodemailer = require('nodemailer');

const dotenv = require('dotenv');
dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use `true` for port 465, `false` for all other ports
    auth: {
        user: process.env.my_mail,
        pass: process.env.password,
    },
});

router.get('/register', (req, res) => {
    res.render('signin', {
        errorMessage: [],
        successMessage: req.flash('success'),
        oldInput: {
            email: '',
            name: '',
            password: '',
            confirmpassword: '',
            workingTitle: '',
        },
        validationErrors: [],
    });
});

router.post(
    '/register',
    check('email')
        .isEmail()
        .custom(async value => {
            const emailVal = await Users.findOne({ where: { email: value } });
            if (emailVal !== null) {
                throw new Error('E-Mail exist, please pick another!');
            }
            return true;
        }),
    check('name').notEmpty().withMessage('Fill the name field'),
    check(
        'password',
        'Password need to be at leat 4 char long and alphanumeric'
    )
        .isLength({ min: 4 })
        .isAlphanumeric(),
    check('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords need to match!');
        }
        return true;
    }),
    async (req, res, next) => {
        const userEmail = req.body.email;
        const userName = req.body.name;
        const userWorkingTitle = req.body.workingTitle;
        const userPassword = req.body.password;
        const confirmPassword = req.body.confirmpassword;
        let profilePicPath;

        console.trace(req.file);

        if (req.file) {
            profilePicPath = req.file.path;
        } else {
            profilePicPath = 'images/blank_profile.png';
        }

        const results = validationResult(req);
        try {
            if (results.isEmpty()) {
                await Users.create({
                    name: userName,
                    workingTitle: userWorkingTitle,
                    email: userEmail,
                    password: userPassword,
                    profileImage: profilePicPath,
                });
                req.flash('success', 'Greetings! You are registered.');
                res.redirect('/');
            } else {
                res.render('signin', {
                    errorMessage: results.array(),
                    successMessage: [],
                    oldInput: {
                        email: userEmail,
                        name: userName,
                        workingTitle: userWorkingTitle,
                        password: userPassword,
                        confirmpassword: confirmPassword,
                        profilePicture: profilePicPath,
                    },
                    validationErrors: results.array(),
                });
            }
        } catch (err) {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        }
    }
);

router.get('/', isLoggedIn, (req, res) => {
    try {
        res.render('login', {
            errorMessage: [],
            oldInput: {
                email: '',
                password: '',
            },
            validationErrors: [],
        });
    } catch (err) {
        const error = new Error(err);
        console.log(error);
        error.httpStatusCode = 500;
        return next(error);
    }
});

router.get('/forgetPassword', (req, res) => {
    try {
        res.render('forgetPassword', {
            errorMessage: [],
            oldInput: {
                email: '',
            },
            validationErrors: [],
        });
    } catch (err) {
        const error = new Error(err);
        console.log(error);
        error.httpStatusCode = 500;
        return next(error);
    }
});

router.post(
    '/resetPassword',
    check('email')
        .isEmail()
        .custom(async value => {
            const email = await Users.findOne({ where: { email: value } });
            if (email === null) {
                return Promise.reject('E-Mail not exist please register!');
            }
            return true;
        }),
    async (req, res) => {
        const userEmail = req.body.email;
        const token = req.session.resetToken;
        try {
            const user = await Users.findOne({ where: { email: userEmail } });
            if (!user) {
                req.flash(
                    'non-exist-email',
                    'E-Mail not exist please register.'
                );
                return res.redirect('/register');
            }
            const info = await transporter.sendMail({
                from: process.env.my_mail, // sender address
                to: user.email, // list of receivers
                subject: 'Update User Password Request✔', // Subject line
                text: `Your token:  ${token}`,
            });
            console.log('Message sent: %s', info);
            res.redirect(`/resetPassword/${user.id}`);
        } catch (err) {
            console.trace(err);
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        }
    }
);

router.get('/resetPassword/:userId', (req, res) => {
    const userId = req.params.userId;
    res.render('resetPassword', {
        pageTitle: 'Reset Password',
        path: '/resetPassword',
        userId: userId,
    });
});

router.post(
    '/updatepassword',
    check(
        'password',
        'Password need to be at leat 4 char long and alphanumeric'
    )
        .isLength({ min: 4 })
        .isAlphanumeric(),
    async (req, res, next) => {
        const newPassword = req.body.password;
        const userId = req.body.userId;
        const emailToken = req.body.emailtoken;
        const sessionToken = req.session.resetToken;
        try {
            const user = await Users.findOne({ where: { id: userId } });
            if (emailToken === sessionToken) {
                await user.update({ password: newPassword });
                res.redirect('/');
            }
        } catch (err) {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        }
    }
);

router.post(
    '/login',
    check('email')
        .isEmail()
        .custom(async value => {
            const email = await Users.findOne({ where: { email: value } });
            if (email === null) {
                return Promise.reject('E-Mail not exist please register!');
            }
            return true;
        }),
    check('password').custom(async (value, { req }) => {
        const user = await Users.findOne({ where: { email: req.body.email } });
        const decryptBool = await bcrypt.compare(value, user.password);
        if (!decryptBool) {
            return Promise.reject('Password is wrong!');
        }
        return true;
    }),
    async (req, res, next) => {
        const clientEmail = req.body.email;
        const results = validationResult(req);
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync('secret reset words', salt);
        try {
            const userValid = await Users.findOne({
                where: {
                    email: clientEmail,
                },
            });
            if (results.isEmpty()) {
                req.session.isLoggedIn = true;
                req.session.userId = userValid.id;
                req.session.isAdmin = userValid.isAdmin;
                req.session.name = userValid.name;
                req.session.resetToken = hash;
                req.session.save(err => {
                    res.redirect('/users/profile');
                });
            } else {
                req.session.resetToken = hash;
                req.session.save(err => {
                    res.render('login', {
                        errorMessage: results.array()[0].msg,
                        oldInput: {
                            email: clientEmail,
                            password: req.body.password,
                        },
                        validationErrors: results.array(),
                    });
                });
            }
        } catch (err) {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        }
    }
);

router.post('/logout', async (req, res, next) => {
    try {
        req.session.isLoggedIn = false;
        req.session.userId = null;
        req.session.isAdmin = false;
        req.session.name = null;
        req.session.save();
        res.redirect('/');
    } catch (err) {
        console.trace(err);
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    }
});

module.exports = router;
