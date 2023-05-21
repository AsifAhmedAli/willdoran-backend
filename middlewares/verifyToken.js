// const jwt = require("jsonwebtoken");
// const verifyToken = (req, res, next) => {
//     const token = req.cookies.token;

//     if (!token) {
//       return res.status(401).json({ message: 'Unauthorized' });
//     }
  
//     try {
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       req.user = decoded;
//       next();
     
//     } catch (error) {
//       return res.status(401).json({ error:error.message});
//     }
// }
  
//   module.exports = {verifyToken}

const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    } else {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = { verifyToken };
