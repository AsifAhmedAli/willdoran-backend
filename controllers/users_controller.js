const conn = require("../conn/conn.js");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const CryptoJS = require("crypto-js");
const bcrypt = require("bcryptjs");
const randomstring = require("randomstring");
const path = require("path");
const express = require("express");
const router = express.Router();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const LinkedInStrategy = require("passport-linkedin-oauth2").Strategy;

// New User Registration
const new_user = async (req, res) => {
  const { name, company, email, password } = req.body;

  // Check if user already exists
  const checkUserQuery = `SELECT * FROM users WHERE email = ?`;
  conn.query(checkUserQuery, [email], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
    if (result.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }
    // Hash the password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
      }
      // Insert new user into database
      const insertUserQuery = `INSERT INTO users (name,company, password, email) VALUES (?, ?, ?, ?)`;
      conn.query(
        insertUserQuery,
        [name, company, hashedPassword, email],
        (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: "Internal server error" });
          }
          // Generate a secure token for email verification
          const token = jwt.sign({ email }, process.env.JWT_SECRET, {
            expiresIn: "1h",
          });
          // Send confirmation email to the newly registered user
          const transporter = nodemailer.createTransport({
            host: "server188.web-hosting.com",
            port: 465,
            auth: {
              user: process.env.EMAIL,
              pass: process.env.PASSWORD,
            },
          });
          const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: "Please confirm your email",
            html: `Please click this link to confirm your email: <a href="${process.env.verifyemail_frontnedurl}?name=${token}">Verify Email</a>`,
          };
          transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ error: "Internal server error" });
            }
            res.status(201).json({
              message:
                "User registered successfully. Please check your email to confirm your account.",
            });
          });
        }
      );
    });
  });
};

// Verify Email
const verify_email = async (req, res) => {
  const { token } = req.params;
  // Verify token and extract email
  let email;
  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    email = decodedToken.email;
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: "Invalid token" });
  }
  // Update verified column

  const updateUserQuery = `UPDATE users SET verified = 1 WHERE email = ?`;
  conn.query(updateUserQuery, [email], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
    res.status(200).json({ message: "Email verified successfully" });
  });
};
// API for User Login

const user_login = async (req, res) => {
  const { email, password } = req.body;

  // Check if user exists
  const checkUserQuery = `SELECT * FROM users WHERE email = ?`;
  conn.query(checkUserQuery, [email], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
    if (result.length === 0) {
      return res
        .status(401)
        .json({ error: "you are not registered, please register first" });
    }
    const user = result[0];
    // Check if user has verified their email
    if (user.verified !== 1) {
      return res
        .status(401)
        .json({ error: "Please verify your email address from you email" });
    }
    // Check if password is correct
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
      }
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      // Generate a JWT token and set it in a cookie

      // const token = jwt.sign({ id: user.id,name:user.name }, process.env.JWT_SECRET);
      // res.cookie("token", token, { httpOnly: true });
      // res.status(200).json({ message: "Login successful" });

      const payload = {
        id: user.id,
        name: user.name,
      };
      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: 360000 },
        (err, token) => {
          if (err) throw err;
          res.cookie("token", token, { httpOnly: true });
          delete user.password;
          res
            .status(200)
            .json({ message: "User logged in successfully", user, token });
        }
      );
    });
  });
};

// // Change Password API for the logged-in user
// const change_password = async (req, res) => {
//     const { current_password, new_password, confirm_new_password } = req.body;
//     const user_id = req.user.id;
//     // Check if all required fields are present
//   if (!current_password || !new_password || !confirm_new_password) {
//     return res.status(400).json({ error: "Please fill in all fields" });
//   }

//   // Check if new password and confirm password fields match
//   if (new_password !== confirm_new_password) {
//     return res.status(400).json({ error: "New password and confirm password fields must match" });
//   }

//     // Check if current password is correct
//     const checkPasswordQuery = `SELECT * FROM users WHERE id = ?`;
//     conn.query(checkPasswordQuery, [user_id], (err, result) => {
//       if (err) {
//         console.error(err);
//         return res.status(500).json({ error: "Internal server error" });
//       }
//       const user = result[0];
//       bcrypt.compare(current_password, user.password, (err, isMatch) => {
//         if (err) {
//           console.error(err);
//           return res.status(500).json({ error: "Internal server error" });
//         }
//         if (!isMatch) {
//           return res.status(401).json({ error: "Invalid current password" });
//         }
//         // Hash the new password
//         bcrypt.hash(new_password, 10, (err, hashedPassword) => {
//           if (err) {
//             console.error(err);
//             return res.status(500).json({ error: "Internal server error" });
//           }
//           // Update the user's password in the database
//           const updatePasswordQuery = `UPDATE users SET password = ? WHERE id = ?`;
//           conn.query(updatePasswordQuery, [hashedPassword, user_id], (err, result) => {
//             if (err) {
//               console.error(err);
//               return res.status(500).json({ error: "Internal server error" });
//             }
//             res.status(200).json({ message: "Password updated successfully" });
//           });
//         });
//       });
//     });
//   };

// Change Password API for the logged-in user
const change_password = async (req, res) => {
  const current_password = req.body.current_password;
  const new_password = req.body.new_password;
  const confirm_new_password = req.body.confirm_new_password;
  // const { current_password, new_password, confirm_new_password } = req.body;
  // console.log(req.body.id);
  const user_id = req.body.id;
  // Check if all required fields are present
  if (!current_password || !new_password || !confirm_new_password) {
    return res.status(400).json({ error: "Please fill in all fields" });
  }

  // Check if new password and confirm password fields match
  if (new_password !== confirm_new_password) {
    return res
      .status(400)
      .json({ error: "New password and confirm password fields must match" });
  }

  // Check if current password is correct
  const checkPasswordQuery = `SELECT * FROM users WHERE id = ?`;
  conn.query(checkPasswordQuery, [user_id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
    if (result.length === 0) {
      // Check if result is empty
      return res.status(404).json({ error: "User not found" });
    }
    const user = result[0];
    bcrypt.compare(current_password, user.password, (err, isMatch) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
      }
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid current password" });
      }
      // Hash the new password
      bcrypt.hash(new_password, 10, (err, hashedPassword) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Internal server error" });
        }
        // Update the user's password in the database
        const updatePasswordQuery = `UPDATE users SET password = ? WHERE id = ?`;
        conn.query(
          updatePasswordQuery,
          [hashedPassword, user_id],
          (err, result) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ error: "Internal server error" });
            }
            res.status(200).json({ message: "Password updated successfully" });
          }
        );
      });
    });
  });
};

//   change email addres API for logged-in user
// Send a 6-digit verification code to the user's email address
const send_verification_code = async (req, res) => {
  const { current_email } = req.body;

  // Check if user exists
  const checkUserQuery = `SELECT * FROM users WHERE email = ?`;
  conn.query(checkUserQuery, [current_email], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
    // Generate a 6-digit verification code
    const verification_code = randomstring.generate({
      length: 6,
      charset: "numeric",
    });

    // Store the verification code in the database for later verification
    const insertVerificationCodeQuery = `INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`;
    conn.query(
      insertVerificationCodeQuery,
      [current_email, verification_code],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Internal server error" });
        }

        // Send the verification code to the user's email address using Nodemailer
        const transporter = nodemailer.createTransport({
          host: "server188.web-hosting.com",
          port: 465,
          auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD,
          },
        });
        const mailOptions = {
          from: process.env.EMAIL,
          to: current_email,
          subject: "Verification code for email change",
          html: `Your verification code is: ${verification_code}`,
        };
        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: "Internal server error" });
          }
          res
            .status(200)
            .json({ message: "Verification code sent successfully" });
        });
      }
    );
  });
};

// Change the user's email address
const change_email = async (req, res) => {
  const { id, verification_code, new_email } = req.body;

  // Check if new email address is already registered in the database
  const checkUserQuery = `SELECT * FROM users WHERE email = ?`;
  conn.query(checkUserQuery, [new_email], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
    if (result.length > 0) {
      return res
        .status(400)
        .json({ error: "Email address is already registered" });
    }

    // Check if verification code is correct and has not expired
    const checkVerificationCodeQuery = `SELECT * FROM verification_codes WHERE email = ? AND code = ? AND expires_at > NOW()`;
    conn.query(
      checkVerificationCodeQuery,
      [new_email, verification_code],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Internal server error" });
        }
        if (result.length === 0) {
          return res
            .status(400)
            .json({ error: "Verification code is invalid or has expired" });
        }

        // Update the user's email address in the database
        const updateUserQuery = `UPDATE users SET email = ? WHERE id = ?`;
        conn.query(updateUserQuery, [new_email, id], (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: "Internal server error" });
          }

          // Delete the verification code from the database
          const deleteVerificationCodeQuery = `DELETE FROM verification_codes WHERE email = ? AND code = ?`;
          conn.query(
            deleteVerificationCodeQuery,
            [new_email, verification_code],
            (err, result) => {
              if (err) {
                console.error(err);
                return res.status(500).json({ error: "Internal server error" });
              }

              res
                .status(200)
                .json({ message: "Email address changed successfully" });
            }
          );
        });
      }
    );
  });
};

// // Forgot Password API
// const forgot_password = async (req, res) => {
//   const { email } = req.body;

//   // Check if email is present in the database
//   const checkUserQuery = `SELECT * FROM users WHERE email = ?`;
//   conn.query(checkUserQuery, [email], (err, result) => {
//     if (err) {
//       console.error(err);
//       return res.status(500).json({ error: "Internal server error" });
//     }
//     if (result.length === 0) {
//       return res.status(400).json({ error: "User with this email does not exist" });
//     }

//     // Generate a secure token for password reset
//     const token = jwt.sign({ email }, "secret_key", { expiresIn: "5m" });

//     // Store the token in the database
//     const insertTokenQuery = `INSERT INTO forgot_password_tokens (email, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`;
//     conn.query(insertTokenQuery, [email, token], (err, result) => {
//       if (err) {
//         console.error(err);
//         return res.status(500).json({ error: "Internal server error" });
//       }

//       // Send password reset link to the user's email address
//       const transporter = nodemailer.createTransport({
//         service: "Gmail",
//         auth: {
//           user: "webdev335@gmail.com",
//           pass: "xszvsubbnfcsjmta",
//         },
//       });
//       const mailOptions = {
//         from: "webdev335@gmail.com",
//         to: email,
//         subject: "Reset your password",
//         html: `<p>Please click this link to reset your password:</p><br><a href="${process.env.CLIENT_URL_CHANGE_PASSWORD}/reset-password/${token}">Reset Password</a>`,
//       };
//       transporter.sendMail(mailOptions, (err, info) => {
//         if (err) {
//           console.error(err);
//           return res.status(500).json({ error: "Internal server error" });
//         }
//         res.status(200).json({ message: "Password reset link has been sent to your email address" });
//       });
//     });
//   });
// };

// Forgot Password API
const forgot_password = async (req, res) => {
  const { email } = req.body;
  // console.log(email);
  // Check if email is present in the database
  const checkUserQuery = `SELECT * FROM users WHERE email = ?`;
  conn.query(checkUserQuery, [email], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
    if (result.length === 0) {
      return res
        .status(400)
        .json({ error: "User with this email does not exist" });
    }

    // Generate a secure token for password reset
    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Store the token in the database with the email
    const insertTokenQuery = `INSERT INTO forgot_password_tokens (email, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`;
    conn.query(insertTokenQuery, [email, token], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
      }

      // Send password reset link to the user's email address
      const transporter = nodemailer.createTransport({
        host: "server188.web-hosting.com",
        port: 465,
        auth: {
          user: process.env.EMAIL,
          pass: process.env.PASSWORD,
        },
      });
      const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: "Reset your password",
        html: `<p>Please click this link to reset your password:</p><br><a href="${process.env.CLIENT_URL_CHANGE_PASSWORD}?name=${token}">Reset Password</a>`,
      };
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Internal server error" });
        }
        res.status(200).json({
          message:
            "Password reset link has been sent to your email address and change password link will expire in 1 hour",
        });
      });
    });
  });
};

// // Reset Password API
// const reset_password = async (req, res) => {
//   const { token } = req.params;
//   const { password } = req.body;

//   // Check if token is valid and has not expired
//   const checkTokenQuery = `SELECT * FROM forgot_password_tokens WHERE token = ? AND expires_at > NOW()`;
//   conn.query(checkTokenQuery, [token], (err, result) => {
//     if (err) {
//       console.error(err);
//       return res.status(500).json({ error: "Internal server error" });
//     }
//     if (result.length === 0) {
//       return res.status(400).json({ error: "Invalid or expired token" });
//     }

//     // Hash the password
//     bcrypt.hash(password, 10, (err, hash) => {
//       if (err) {
//         console.error(err);
//         return res.status(500).json({ error: "Internal server error" });
//       }

//       // Update the user's password in the database
//       const updatePasswordQuery = `UPDATE users SET password = ? WHERE email = ?`;
//       conn.query(updatePasswordQuery, [hash, result[0].email], (err, result) => {
//         if (err) {
//           console.error(err);
//           return res.status(500).json({ error: "Internal server error" });
//         }

//         // Delete the token from the database
//         const deleteTokenQuery = `DELETE FROM forgot_password_tokens WHERE token = ?`;
//         conn.query(deleteTokenQuery, [token], (err, result) => {
//           if (err) {
//             console.error(err);
//             return res.status(500).json({ error: "Internal server error" });
//           }

//           res.status(200).json({ message: "Password reset successful" });
//         });
//       });
//     });
//   });
// };

// Reset Password API
const reset_password = async (req, res) => {
  const { token } = req.body;
  const { password, confirm_password } = req.body;
  console.log(token);
  console.log(password);
  console.log(confirm_password);
  // Check if token is valid and has not expired
  const checkTokenQuery = `SELECT * FROM forgot_password_tokens WHERE token = ? AND expires_at > NOW()`;
  conn.query(checkTokenQuery, [token], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
    if (result.length === 0) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // Hash the new password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
      }

      // Update the user's password in the database
      const updatePasswordQuery = `UPDATE users SET password = ? WHERE email = ?`;
      conn.query(
        updatePasswordQuery,
        [hashedPassword, result[0].email],
        (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: "Internal server error" });
          }

          // Delete the token from the database
          const deleteTokenQuery = `DELETE FROM forgot_password_tokens WHERE token = ?`;
          conn.query(deleteTokenQuery, [token], (err, result) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ error: "Internal server error" });
            }

            res.status(200).json({ message: "Password reset successful" });
          });
        }
      );
    });
  });
};

// // Google Login
// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       callbackURL: "http://localhost:8000/google/callback",
//     },
//     async (accessToken, refreshToken, profile, done) => {
//       try {
//         // Check if user exists in database
//         const selectUserQuery = `SELECT * FROM users WHERE email = ?`;
//         conn.query(selectUserQuery, [profile.emails[0].value], (err, result) => {
//           if (err) {
//             return done(err);
//           }
//           if (result.length === 0) {
//             // If user doesn't exist, create a new user in the database
//             const insertUserQuery = `INSERT INTO users (name, email) VALUES (?, ?)`;
//             conn.query(insertUserQuery, [profile.displayName, profile.emails[0].value], (err, result) => {
//               if (err) {
//                 return done(err);
//               }
//               const user = { id: result.insertId, name: profile.displayName, email: profile.emails[0].value };
//               const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });
//               return done(null, { token });
//             });
//           } else {
//             // If user exists, return the user's JWT token
//             const user = { id: result[0].id, name: result[0].name, email: result[0].email };
//             const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });
//             return done(null, { token });
//           }
//         });
//       } catch (err) {
//         console.error(err);
//         return done(err);
//       }
//     }
//   )
// );

// // Serialize user for session
// passport.serializeUser((user, done) => {
//   done(null, user);
// });

// // Deserialize user from session
// passport.deserializeUser((user, done) => {
//   done(null, user);
// });

// // Google Login Callback
// const googleCallback = (req, res) => {
//   passport.authenticate("google", (err, user) => {
//     if (err) {
//       console.error(err);
//       return res.status(500).json({ error: "Internal server error" });
//     }
//     if (!user) {
//       return res.status(401).json({ error: "Unauthorized" });
//     }
//     // Set token in cookie
//     res.cookie("token", user.token, { httpOnly: true });
//     res.redirect("http://localhost:8000/protected");
//   })(req, res);
// };

// Google Login
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://api.puretalent.ai/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists in database
        const selectUserQuery = `SELECT * FROM users WHERE email = ?`;
        conn.query(
          selectUserQuery,
          [profile.emails[0].value],
          (err, result) => {
            if (err) {
              return done(err);
            }
            if (result.length === 0) {
              // If user doesn't exist, create a new user in the database
              const insertUserQuery = `INSERT INTO users (name, email, google_id) VALUES (?, ?, ?)`;
              conn.query(
                insertUserQuery,
                [profile.displayName, profile.emails[0].value, profile.id],
                (err, result) => {
                  if (err) {
                    return done(err);
                  }
                  var useremail = profile.emails[0];
                  const user = {
                    id: result.insertId,
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    google_id: profile.id,
                  };
                  const token = jwt.sign(user, process.env.JWT_SECRET, {
                    expiresIn: "1h",
                  });
                  return done(null, { token, useremail });
                }
              );
            } else {
              // If user exists, link the Google account to the existing user
              const updateUserQuery = `UPDATE users SET google_id = ? WHERE email = ?`;
              conn.query(
                updateUserQuery,
                [profile.id, profile.emails[0].value],
                (err, result) => {
                  if (err) {
                    return done(err);
                  }
                  var useremail = profile.emails[0];
                  const user = {
                    id: result.insertId,
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    google_id: profile.id,
                  };
                  const token = jwt.sign(user, process.env.JWT_SECRET, {
                    expiresIn: "1h",
                  });
                  return done(null, { token, useremail });
                }
              );
            }
          }
        );
      } catch (err) {
        console.error(err);
        return done(err);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Google Login Callback
const googleCallback = (req, res) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
    if (!user) {
      return res.status(401).json({ error: info.message || "Unauthorized" });
    }
    // Check if user exists in database
    var id = "";
    const selectUserQuery = `SELECT * FROM users WHERE email = ?`;
    conn.query(selectUserQuery, [user.useremail.value], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
      }
      id = result[0].id;
      res.redirect(
        `${process.env.clientfrontend}/funccall.html?name=${user.token}&id=${id}`
      );
    });
    // if (result.length === 0) {
    // console.log(user.useremail.value);
    // console.log(info);
    // Set token in cookie
    // res.send("token", user.token);
  })(req, res);
};

// facebook login

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "https://api.puretalent.ai/facebook/callback",
      profileFields: ["id", "displayName", "email"],
      scope: ["email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists in database
        const selectUserQuery = `SELECT * FROM users WHERE email = ?`;
        conn.query(
          selectUserQuery,
          [profile.emails[0].value],
          (err, result) => {
            if (err) {
              return done(err);
            }
            if (result.length === 0) {
              // If user doesn't exist, create a new user in the database
              const insertUserQuery = `INSERT INTO users (name, email) VALUES (?, ?)`;
              conn.query(
                insertUserQuery,
                [profile.displayName, profile.emails[0].value],
                (err, result) => {
                  if (err) {
                    return done(err);
                  }
                  const user = {
                    id: result.insertId,
                    name: profile.displayName,
                    email: profile.emails[0].value,
                  };
                  const token = jwt.sign(user, process.env.JWT_SECRET, {
                    expiresIn: "1h",
                  });
                  return done(null, { token });
                }
              );
            } else {
              // If user exists, return the user's JWT token
              const user = {
                id: result[0].id,
                name: result[0].name,
                email: result[0].email,
              };
              const token = jwt.sign(user, process.env.JWT_SECRET, {
                expiresIn: "1h",
              });
              return done(null, { token });
            }
          }
        );
      } catch (err) {
        console.error(err);
        return done(err);
      }
    }
  )
);

const facebook_login = (req, res) => {
  passport.authenticate("facebook")(req, res);
};

const facebook_callback = (req, res) => {
  passport.authenticate("facebook", { session: false }, (err, user) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
    if (!user) {
      return res.status(400).json({ error: "Facebook authentication failed" });
    }
    // Set the JWT token as a cookie in the response
    res.redirect(
      `${process.env.clientfrontend}/funccall.html?name=${user.token}`
    );
  })(req, res);
};

// login with linked-in

passport.use(
  new LinkedInStrategy(
    {
      clientID: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      callbackURL: "https://api.puretalent.ai/auth/linkedin/callback",
      scope: ["r_emailaddress", "r_liteprofile"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists in database
        const selectUserQuery = `SELECT * FROM users WHERE email = ?`;
        conn.query(
          selectUserQuery,
          [profile.emails[0].value],
          (err, result) => {
            if (err) {
              return done(err);
            }
            if (result.length === 0) {
              // If user doesn't exist, create a new user in the database
              const insertUserQuery = `INSERT INTO users (name, email) VALUES (?, ?)`;
              conn.query(
                insertUserQuery,
                [profile.displayName, profile.emails[0].value],
                (err, result) => {
                  if (err) {
                    return done(err);
                  }
                  var useremail = profile.emails[0];
                  const user = {
                    id: result.insertId,
                    name: profile.displayName,
                    email: profile.emails[0].value,
                  };
                  const token = jwt.sign(user, process.env.JWT_SECRET, {
                    expiresIn: "1h",
                  });
                  return done(null, { token, useremail });
                }
              );
            } else {
              // If user exists, return the user's JWT token
              var useremail = result[0].email;
              const user = {
                id: result[0].id,
                name: result[0].name,
                email: result[0].email,
              };
              const token = jwt.sign(user, process.env.JWT_SECRET, {
                expiresIn: "1h",
              });
              return done(null, { token, useremail });
            }
          }
        );
      } catch (err) {
        console.error(err);
        return done(err);
      }
    }
  )
);

const linkedin_login = (req, res) => {
  passport.authenticate("linkedin")(req, res);
};

const linkedin_callback = (req, res) => {
  passport.authenticate("linkedin", { session: false }, (err, user) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
    if (!user) {
      return res.status(400).json({ error: "LinkedIn authentication failed" });
    }
    var id = "";
    const selectUserQuery = `SELECT * FROM users WHERE email = ?`;
    conn.query(selectUserQuery, [user.useremail.value], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
      }
      id = result[0].id;
      res.redirect(
        `${process.env.clientfrontend}/funccall.html?name=${user.token}&id=${id}`
      );
    });
    // Set the JWT token as a cookie in the response
    // res.cookie("token", user.token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    // });
    // res.redirect("http://localhost:8000/welcome-linkedin");
  })(req, res);
};

// Logout API
const logout = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Clear JWT cookie
    res.clearCookie("token");
    res.clearCookie("user");
    res.clearCookie("id");

    // Clear session cookies for Google, Facebook, and LinkedIn logins
    req.session.destroy((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
      }

      // Return success response
      res.status(200).json({ message: "Logout successful" });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const get_user = (req, res) => {
  const userId = req.params.id;
  // console.log(userId);
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  try {
    conn.query(query, (err, results) => {
      if (err) {
        throw err;
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      delete results[0].password;
      return res.status(200).json(results[0]);
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  get_user,
  new_user,
  verify_email,
  user_login,
  change_password,
  send_verification_code,
  change_email,
  forgot_password,
  reset_password,
  googleCallback,
  facebook_login,
  facebook_callback,
  linkedin_login,
  linkedin_callback,
  logout,
};
