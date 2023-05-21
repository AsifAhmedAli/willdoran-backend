var mysql = require("mysql");
require("dotenv").config();
// const connection = () => {
var conn = mysql.createConnection({
  host: process.env.host,
  user: process.env.user,
  password: process.env.pass,
  database: process.env.dbname,
});
conn.connect(function (err) {
  if (err) throw err;
  console.log("Connected to DataBase!");
});
// };

module.exports = conn;
