const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  // হেডার থেকে টোকেন নেওয়া (Format: Bearer <token>)
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // টোকেন ভেরিফাই করা
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // রিকোয়েস্টের সাথে ইউজারের ইনফো যোগ করা, যাতে পরের ফাংশনে ইউজার আইডি পাওয়া যায়
    req.user = decoded; 
    next(); // সব ঠিক থাকলে পরের কাজে যাওয়ার অনুমতি দেওয়া
  } catch (error) {
    return res.status(403).json({ message: "Forbidden: Invalid or expired token" });
  }
};

module.exports = verifyToken;