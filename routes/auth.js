const express = require("express");
const router = express.Router();

// শুধু টেস্ট করার জন্য বেসিক রাউট
router.get("/", (req, res) => {
  res.send("Auth route is working!");
});

module.exports = router;