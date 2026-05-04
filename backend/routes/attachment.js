const express = require("express");
const router = express.Router();

const { getAttachmentByNameSeq } = require("../services/documentService");

router.get("/", async (req, res) => {
  try {
    const nameSeq = req.query.keyword;

    const files = await getAttachmentByNameSeq(nameSeq);

    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
