const express = require("express");
const router = express.Router();

const { getDocuments, getDocumentPDF } = require("../services/documentService");

router.get("/", async (req, res) => {
  try {
    const companyId = req.query.company_id;
    const files = await getDocuments(companyId);
    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/pdf", async (req, res) => {
  try {
    const nameSeq = req.query.keyword;

    const pdfData = await getDocumentPDF(nameSeq);

    if (!pdfData) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json(pdfData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
