if(process.env.NODE_ENV !=="production"){
    require('dotenv').config();
}
// require('dotenv').config();
const express = require("express")
const path = require('path')
const Games = require('./models/games')
const catchasync = require('./utils/catchasync')
const ExpressError = require('./utils/expresserror')
const Review = require('./models/review.js')
const mongoose = require('mongoose');
const mo = require('method-override')
const Joi = require('joi')
const session = require('express-session')
const flash = require('connect-flash')
const { Gschema, Rschema } = require('./schema.js')
const ejsMate = require('ejs-mate')
const { error } = require("console")
const passport = require('passport')
const localStorage = require('passport-local')
const User = require('./models/user.js')
const { isloged, storeR, isAuthor, isReview } = require('./views/middleware.js')
const user = require("./models/user.js")
const multer = require('multer')
const { storage, cloudinary } = require('./cloudinary')
const upload = multer({ storage })
const mongoSantize = require('express-mongo-sanitize');
const helmet = require('helmet');

//mongo connection
mongoose.connect('mongodb://127.0.0.1:27017/CroolGames')
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((error) => {
        console.error("Error connecting to MongoDB:", error);
    });
app = express();
app.engine('ejs', ejsMate)
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '/views'))
app.use(express.static("public"));
app.use(mongoSantize());
app.use(express.urlencoded({ extended: true }))
app.use(mo("_method"))

//flash
const sessionconfig = {
    name: 'Session',
    secret: 'secretherebaba',
    resave: false,
    saveUninitialised: true,
    cookie: {
        httpOnly: true,
        // secure:true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionconfig))
app.use(flash())
const scriptSrcUrls = [
    "https://cdn.jsdelivr.net",
    "https://code.jquery.com/",
    "https://stackpath.bootstrapcdn.com/"];
const styleSrcUrls = [
    "https://cdn.jsdelivr.net",
    "https://code.jquery.com/"];
const connectSrcUrls = [];
const fontSrcUrls = [];
const imgSrcUrls = [
    "'self'", "'blob'", "'data'",
    `https://res.cloudinary.com/dnyuashia/`,
    "https://images.unsplash.com/",
    "https://plus.unsplash.com/"];

app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: [],
        connectSrc: ["'self'", ...connectSrcUrls],
        scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
        styleSrc: ["'self'", ...styleSrcUrls],
        workerSrc: ["'self'", "blob:"],
        objectSrc: [],
        imgSrc: imgSrcUrls,
        fontSrc: ["'self'", ...fontSrcUrls],
    }
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStorage(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req, res, next) => {
    console.log(req.query);
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success')
    res.locals.error = req.flash('error')
    next();
})


//middleware
const validateSchema = (req, res, next) => {
    const { error } = Gschema.validate(req.body)
    if (error) {
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    }
    else {
        next();
    }
}
const reviewSchema = (req, res, next) => {
    const { error } = Rschema.validate(req.body)
    if (error) {
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    }
    else {
        next();
    }
}

//games routes
app.get("/", async (req, res) => {
    const gam = await Games.find({});
    res.render('home', { gam })
})
app.get('/games/new', isloged, async (req, res) => {
    res.render('new')
})
app.post('/games', upload.array('image'), validateSchema, catchasync(async (req, res, next) => {
    const g = new Games(req.body.games);
    g.image = req.files.map(f => ({ url: f.path, filename: f.filename }))
    g.author = req.user._id;
    await g.save();
    req.flash('success', 'Successfully Uploaded a Game');
    res.redirect(`/games/${g._id}`);
}));
app.get('/games/:id', async (req, res) => {
    const g = await Games.findById(req.params.id).populate({
        path: 'reviews',
        populate: {
            path: 'author'
        }
    }).populate('author')
    console.log(g)
    if (!g) {
        req.flash('error', 'Cannot find that campground')
        return res.redirect('/')
    }
    res.render('show', { g })
})
app.get('/games/:id/edit', isloged, isAuthor, async (req, res) => {
    const { id } = req.params;
    try {
        const g = await Games.findById(id);
        if (!g) {
            req.flash('error', 'Cannot find that game');
            return res.redirect('/games');
        }
        res.render('edit', { g });
    } catch (error) {
        req.flash('error', 'An error occurred');
        res.redirect('/games');
    }
});

app.put('/games/:id', isAuthor, upload.array('image'), validateSchema, async (req, res) => {
    const { id } = req.params;
    try {
        const gs = await Games.findOneAndUpdate(
            { _id: id },
            { $set: { ...req.body.games } },
            { new: true }
        );
        const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }))
        gs.image.push(...imgs);
        await gs.save();
        if (req.body.deleteImages) {
            for (let filename of req.body.deleteImages) {
                await cloudinary.uploader.destroy(filename);
            }
            await gs.updateOne({ $pull: { image: { filename: { $in: req.body.deleteImages } } } })
        }
        req.flash('success', 'Successfully Updated a Game');
        res.redirect(`/games/${gs._id}`);
    } catch (error) {
        req.flash('error', 'An error occurred');
        res.redirect(`/games/${id}`);
    }
});

app.delete('/games/:id', isAuthor, catchasync(async (req, res, next) => {
    const { id } = req.params;
    await Games.findByIdAndDelete(id);
    req.flash('success', 'Successfully Deleted a Game')
    res.redirect('/')
}))

//Review routes
app.post('/games/:id/review', reviewSchema, isloged, catchasync(async (req, res) => {
    const games = await Games.findById(req.params.id);
    const review = new Review(req.body.review);
    review.author = req.user._id;
    games.reviews.push((review));
    await review.save();
    await games.save();
    req.flash('success', 'Successfully Submited a Review')
    res.redirect(`/games/${games._id}`);
}))

app.delete('/games/:id/reviews/:reviewid', isloged, isReview, catchasync(async (req, res) => {
    const { id, reviewid } = req.params;
    const games = await Games.findById(req.params.id);
    await Games.findByIdAndUpdate(id, { $pull: { reviews: reviewid } })
    await Review.findByIdAndDelete(reviewid)
    req.flash('success', 'Successfully Deleted a Review')
    res.redirect(`/games/${id}`);
}))
//register routes
app.get('/register', (req, res, next) => {
    res.render('user/register');
})
app.post('/register', async (req, res) => {
    const { email, username, password } = req.body;

    try {
        const user = new User({ email, username });
        const registeredUser = await User.register(user, password);

        console.log(registeredUser);
        req.flash('success', 'Welcome to Yelp');
        res.redirect('/');
    } catch (err) {
        req.flash('error', err.message);
        res.redirect('/')
    }
});
//login routes
app.get('/login', (req, res) => {
    res.render('user/login')
})
app.post('/login', storeR, passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    req.flash('success', 'Hurray you are login')
    const redirectUrl = res.locals.returnTo || '/'
    res.redirect(redirectUrl)
})
//logout
app.get('/logout', (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        req.flash('success', 'Goodbye!');
        res.redirect('/');
    });
});

//error handling
app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
})
app.use((err, req, res, next) => {
    const { statuscode = 500 } = err;
    if (!err.message) err.message = "OH SomeThing went Wrong";
    res.status(statuscode).render('error', { err });
})

app.listen(3000, () => {
    console.log("Connected to 3000")
})