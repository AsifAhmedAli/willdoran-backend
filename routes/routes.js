const express = require("express");
const passport = require("passport");
const router = express.Router();
const { verifyToken } = require("../middlewares/verifyToken.js");
const users_controller = require("../controllers/users_controller.js");
const messages_controller = require("../controllers/messages_controller.js");
const {
  validateRegistration,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
} = require("../middlewares/validations.js");
const { authMiddleware } = require("../middlewares/authMiddleware.js");

//   new user registration
router.post("/new-user", validateRegistration, users_controller.new_user);

//   verify email on registration
router.get("/verify-email/:token", users_controller.verify_email);

// user login
router.post("/user-login", validateLogin, users_controller.user_login);

// change password for logged-in user

router.post("/change-password", users_controller.change_password);
// send verification code

router.post("/send-verification-code", users_controller.send_verification_code);
// change email for logged-in user

router.post("/change-email", users_controller.change_email);
// Forgot Password Route

router.get("/get-user/:id", users_controller.get_user);

router.post(
  "/forgot-password",
  validateForgotPassword,
  users_controller.forgot_password
);
// Reset fotgot Password
router.put(
  "/reset-password",
  validateResetPassword,
  users_controller.reset_password
);

// Get in Touch Route

router.post("/get-in-touch", messages_controller.get_in_touch);

// login with google
router.get("/", (req, res) => {
  res.send('<a href="/auth/google">Login with Google</a>');
});
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);

// Google Login Callback
router.get("/google/callback", users_controller.googleCallback);

router.get("/protected", (req, res) => {
  res.send("Successfully logged-in with google");
});
router.get("/failure", (req, res) => {
  res.send("logged-in failed with google");
});

// login with facebook
router.get("/facebook", (req, res) => {
  res.send('<a href="/facebook/callback">Login with Facebook</a>');
});

router.get("/facebook", users_controller.facebook_login);
router.get("/facebook/callback", users_controller.facebook_callback);

router.get("/welcome-facebook", (req, res) => {
  res.send("Successfully logged-in with facebook");
});

// login with LinkedIn

router.get("/linkedin", (req, res) => {
  res.send('<a href="/auth/linkedin/callback">Login with LinkedIn</a>');
});
router.get("/linkedin", users_controller.linkedin_login);
router.get("/auth/linkedin/callback", users_controller.linkedin_callback);
router.get("/welcome-linkedin", (req, res) => {
  res.send("Successfully logged-in with Linked-in");
});

// define the logout route
router.get("/logout", verifyToken, authMiddleware, users_controller.logout);

module.exports = router;
