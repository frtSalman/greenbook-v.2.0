const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const usersRouter = require('./routes/users');
const postsRouter = require('./routes/posts');
const registerRouter = require('./routes/register-login');
const projectRouter = require('./routes/projects');
const path = require('path');
const app = express();
const multer = require('multer');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const sequelize = require('./util/database');

app.set('view engine', 'ejs');
app.set('views', 'views');

dotenv.config();

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Access-Control-Allow-Methods',
        'OPTIONS, GET, POST, PUT, PATCH, DELETE'
    );
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
    );
    next();
});

const tenHour = 1000 * 60 * 60 * 10;

app.use(
    session({
        secret: 'my secret infos',
        store: new SequelizeStore({
            db: sequelize,
        }),
        resave: false,
        saveUninitialized: false,
    })
);

app.use(function (req, res, next) {
    req.session.cookie.originalMaxAge = tenHour;
    req.session.touch();
    next();
});

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.google-earth.kml+xml') {
            cb(null, 'public/kmlFiles');
        } else {
            cb(null, 'uploads');
        }
    },
    filename: (req, file, cb) => {
        const safeFileName =
            Date.now() +
            '-' +
            file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, safeFileName);
    },
});

const fileFilter = (req, file, cb) => {
    if (
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpeg' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/webp' ||
        file.mimetype === 'application/vnd.google-earth.kml+xml'
    ) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const upload = multer({
    storage: fileStorage,
    fileFilter: fileFilter,
});

app.use(flash());

app.use(
    '/projects',
    upload.fields([
        { name: 'centerImage', maxCount: 1 },
        { name: 'kmStartImage', maxCount: 1 },
        { name: 'kmEndImage', maxCount: 1 },
        { name: 'conImage', maxCount: 1 },
        { name: 'quarryImage', maxCount: 1 },
        { name: 'plentImage', maxCount: 1 },
        { name: 'kmlFileOne' },
        { name: 'kmlFileTwo' },
        { name: 'kmlFileThree' },
        { name: 'kmlFileFour' },
    ]),
    projectRouter
);

app.use('/posts', upload.single('postImage'), postsRouter);

app.use('/users', upload.single('updateProfilePic'), usersRouter);

app.use(upload.single('profilePic'), registerRouter);

app.use((error, req, res, next) => {
    console.log(error);
    res.status(500).render('500', {
        pageTitle: 'Error!',
        path: '/500',
        error: error.message || 'An unexpected error occurred',
    });
});

app.get('/500', (req, res, next) => {
    res.status(500).render('500', {
        pageTitle: 'Error!',
        path: '/500',
    });
});

app.use((req, res, next) => {
    res.status(404).render('404', {
        pageTitle: 'Page Not Found',
        path: '/404',
    });
});

// Synchronize Sequelize models and then start the server
sequelize
    .sync()
    .then(result => {
        app.listen(process.env.PORT, () => console.log('connected'));
    })
    .catch(err => {
        console.trace(err);
    });
