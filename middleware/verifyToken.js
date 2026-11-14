const { createRemoteJWKSet, jwtVerify } = require("jose");

const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`));

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // ✅ jose লাইব্রেরি দিয়ে টোকেন ভেরিফাই করা হচ্ছে
    const { payload } = await jwtVerify(token, JWKS);

    // req.user এ ডাটা সেট করা
    req.user = {
      id: payload.sub || payload.id,
      email: payload.email,
      name: payload.name
    }; 

    
    
    next();
  } catch (error) {
    console.error("❌ JWT Verification Error:", error.message); 
    return res.status(403).json({ message: "Forbidden: Invalid or expired token" });
  }
};

module.exports = verifyToken;