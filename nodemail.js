const nodemailer = require("nodemailer");
let transporter = nodemailer.createTransport({
  host: "mail.privateemail.com",
  port: 465, // or 465 if using SSL
  secure: true, // true for 465, false for other ports
  auth: {
    user: "info@smartalerts.org", // Your full email address
    pass: process.env.EMAIL_PASSWORD, // Your password from environment variable
  },
});

/**
 * Send 2FA code via email.
 * @param {string} recipientEmail - The email address of the recipient.
 * @param {string} code - The 2FA code to send.
 *
 */
function send2FACode(recipientEmail, code) {
  let mailOptions = {
    from: "info@smartalerts.org",
    to: recipientEmail,
    subject: `SmartAlerts: Your 2FA code is: ${code}`,
    text: `Your 2FA code is: ${code}`,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}
const sendMessage = (
  recipientEmail,
  message,
  subject = "SmartAlerts Notification",
  html = false
) => {
  let mailOptions = {
    from: "info@smartalerts.org",
    to: recipientEmail,
    subject: subject,
  };

  if (html) {
    mailOptions.html = message;
  } else {
    mailOptions.text = message;
  }

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

module.exports = {
  send2FACode,
  sendMessage,
};
