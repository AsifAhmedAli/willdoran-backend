const conn = require("../conn/conn.js");
const nodemailer = require("nodemailer");

// Get in Touch API
const get_in_touch = async (req, res) => {
  const { first_name, last_name, email, message } = req.body;

  // Check if all required fields are present
  if (!first_name || !last_name || !email || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Insert new message into database
  const insertMessageQuery = `INSERT INTO messages (first_name, last_name, email, message) VALUES (?, ?, ?, ?)`;
  conn.query(
    insertMessageQuery,
    [first_name, last_name, email, message],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
      }

      // Send email notification to admin
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
        to: process.env.ADMIN_EMAIL,
        subject: "New message from Get in Touch form",
        html: `<p>Hi Admin! You have received a new message from the Get in Touch form:</p>
             <ul>
               <li><strong>Name:</strong> ${first_name} ${last_name}</li>
               <li><strong>Email:</strong> ${email}</li>
               <li><strong>Message:</strong> ${message}</li>
             </ul>`,
      };
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error(err);
        } else {
          console.log("Email notification sent to admin:", info.response);
        }
      });

      res.status(201).json({ message: "Message sent successfully" });
    }
  );
};

module.exports = {
  get_in_touch,
};
