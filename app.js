//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const _ = require("lodash");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
//const passportLocalMongoose = require("passport-local-mongoose");
const request = require("request");
const { User, UserData, Teacher } = require("./modal");

const loginError = `<div class="messages error"><div class="messages-container"><div class="message-text" aria-invalid="1" tabindex="-1" >Error: The email address and password combination you entered cannot be recognized or does not exist. Please try again.</div></div></div>`;

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 },
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });

passport.use("teacherlocal", new LocalStrategy(Teacher.authenticate()));
// passport.serializeUser(Teacher.serializeUser());
// passport.deserializeUser(Teacher.deserializeUser());

passport.use("userlocal", new LocalStrategy(User.authenticate()));
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  if (user != null) done(null, user);
});

app.get("/", function (req, res) {
  res.render("home");
});

app.get("/login", function (req, res) {
  res.render("login", { error: "" });
});

app.get("/loginT", function (req, res) {
  res.render("loginT", { error: "" });
});

app.get("/sign_up", function (req, res) {
  res.render("sign_up", { error: "" });
});

app.get("/homePage", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("homePage");
  } else {
    res.redirect("/login");
  }
});

app.get("/homePageTeacher", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("homePageTeacher");
  } else {
    res.redirect("/loginT");
  }
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/logout", function (req, res) {
  res.redirect("/login");
});

// app.post("/logout", function(req, res){
//   req.logout();
//   res.redirect("/");
// });

app.post("/sign_up", function (req, res) {
  const teacher = new Teacher({
    username: req.body.username,
    password: req.body.password,
  });
  Teacher.register(teacher, req.body.password, function (err, user) {
    console.log(err, user);
    if (err) {
      console.log(err);
      res.render("sign_up", {
        error: `A user with the given username is already registered`,
      });
    } else {
      passport.authenticate("teacherlocal")(req, res, function () {
        console.log(user);
        res.redirect("/homePageTeacher");
      });
    }
  });
});

app.post("/loginTeacher", function (req, res) {
  console.log(req.body);
  const teacher = new Teacher({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(teacher, function (err) {
    if (err) {
      console.log(err, `error`);
      res.render("login", { error: loginError });
    } else {
      passport.authenticate("teacherlocal")(req, res, function () {
        res.redirect("/homePageTeacher");
      });
    }
  });
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  console.log(user.username, user.password);

  moodle(user.username, user.password, req, res, user);

  // req.login(user, function(err){
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     passport.authenticate("local")(req, res, function(){
  //       res.redirect("/homePage");
  //     });
  //   }
  // });
});

//MoodleApi
const moodle = function (prn, password, req, res1, user) {
  const url = `http://115.247.20.236/moodle/login/token.php?username=${prn}&password=${password}&service=moodle_mobile_app&moodlewsrestformat=json`;
  request({ url }, (error, response) => {
    const data = JSON.parse(response.body);

    if (data.error) {
      console.log(`Error ${data.error}`);
      res1.render("login", { error: loginError });
    } else {
      const qurl = `http://115.247.20.236/moodle/webservice/rest/server.php?wstoken=${data.token}&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json`;
      request({ url: qurl }, (error, res) => {
        const Mdata = JSON.parse(res.body);

        const userData = new UserData({
          _id: Mdata.userid,
          clgName: Mdata.sitename,
          prn: Mdata.username,
          branch: Mdata.firstname,
          name: Mdata.lastname.substr(Mdata.lastname.indexOf(" ") + 1),
        });

        //console.log(user);

        User.findById(userData._id, function (err, docs) {
          if (err != null) {
            console.log(`Error occured ${err}`);
          } else if (docs != null) {
            console.log(`User Found ${docs}`);
            req.login(user, function (err) {
              if (err) {
                console.log(err);
              } else {
                passport.authenticate("userlocal")(req, res, function () {
                  res1.redirect("/homePage");
                });
              }
            });
          } else {
            console.log(`User not Found ${docs}`);
            User.register(
              { _id: userData._id, username: userData.prn },
              password,
              function (err, user) {
                if (err) {
                  console.log(err);
                  res1.redirect("login", { error: loginError });
                } else {
                  userData.save(function (err, result) {
                    if (err) {
                      console.log(err);
                    } else {
                      console.log(result);
                    }
                  });
                  passport.authenticate("userlocal")(req, res, function () {
                    res1.redirect("homePage");
                  });
                }
              }
            );
          }
        });
        //res1.render("homePage");
      });
    }
  });
};

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
