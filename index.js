const express = require("express");
const cookieParser = require("cookie-parser");
const conn = require("./conn/conn");
const router = require("./routes/routes");
const cors = require("cors");
const users_controller = require("./controllers/users_controller.js");
const session = require("express-session");
const passport = require("passport");

const app = express();
app.use(session({ secret: "cats" }));
app.use(passport.initialize());
app.use(passport.session());

const port = process.env.PORT || 8000;

app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// router
app.use("/", router);
// server file
app.listen(port, () => {
  console.log(`App listening at port ${port}!`);
});
