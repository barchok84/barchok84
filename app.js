// utils/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// Protect routes - only logged-in users can access
exports.protect = async (req, res, next) => {
  try {
    // 1) Get token from headers, cookies, or localStorage (via Authorization header)
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in! Please log in to access.',
      });
    }

    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.',
      });
    }

    // 4) Grant access
    req.user = currentUser;
    next();
  } catch (err) {
    res.status(401).json({
      status: 'fail',
      message: 'Invalid or expired token. Please log in again.',
    });
  }
};