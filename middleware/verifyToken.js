const { createRemoteJWKSet, jwtVerify } = require("jose");

// Get public keys from BetterAuth API
const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`));

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify token
    const { payload } = await jwtVerify(token, JWKS);
    req.user = {
      id: payload.sub || payload.id,
      email: payload.email,
      name: payload.name,
    };
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

module.exports = verifyToken;