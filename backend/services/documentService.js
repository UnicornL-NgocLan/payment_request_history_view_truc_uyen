const { getOdoo, connectOdoo } = require("../odoo");
const axios = require("axios");

async function getAttachmentByNameSeq(nameSeq) {
  await connectOdoo();

  const documents = await new Promise((resolve, reject) => {
    const inParams = [];
    inParams.push([["name_seq", "=", nameSeq]]);
    inParams.push(["id", "name_seq"]);
    inParams.push(0);
    const params = [];
    params.push(inParams);
    getOdoo().execute_kw("sea.sign.document", "search_read", params, (err, companies) => {
      if (err) {
        reject(err);
      } else {
        resolve(companies);
      }
    });
  });
  if (!documents.length) {
    return [];
  }

  const documentId = documents[0].id;

  const attachments = await new Promise((resolve, reject) => {
    const inParams = [];
    inParams.push([["sea_sign_document", "=", documentId]]);
    inParams.push(["sea_sign_attachment_filename_new", "sea_sign_attachment_preview"]);
    inParams.push(0);
    const params = [];
    params.push(inParams);
    getOdoo().execute_kw("sea.sign.attachment", "search_read", params, (err, companies) => {
      if (err) {
        reject(err);
      } else {
        resolve(companies);
      }
    });
  });
  return attachments;
}

async function getDocuments(companyId) {
  await connectOdoo();

  const domain = [
    ["document_detail", "=", 10],
    ["status", "!=", "draft"],
    ["company_id", "=", parseInt(companyId)],
  ];
  const documents = await new Promise((resolve, reject) => {
    const inParams = [];
    inParams.push(domain);
    inParams.push([
      "name_seq",
      "name",
      "employee_request",
      "department_employee_request",
      "pr_supplier_name",
      "sent_date",
      "document_description",
      "status",
      "pr_remaining_amount",
      "document_status",
      "payment_request",
    ]);
    inParams.push(0);
    const params = [];
    params.push(inParams);
    getOdoo().execute_kw("sea.sign.document", "search_read", params, (err, companies) => {
      if (err) {
        reject(err);
      } else {
        resolve(companies);
      }
    });
  });

  // Collect unique payment_request IDs (many2one returns [id, name] or false)
  const prIds = [...new Set(
    documents
      .map((doc) => doc.payment_request && doc.payment_request[0])
      .filter(Boolean)
  )];

  // Batch fetch expire_date from sea.sign.payment.request
  let expireDateMap = {};
  if (prIds.length > 0) {
    const prRecords = await new Promise((resolve, reject) => {
      const inParams = [];
      inParams.push([["id", "in", prIds]]);
      inParams.push(["id", "expire_date"]);
      inParams.push(0);
      const params = [];
      params.push(inParams);
      getOdoo().execute_kw("sea.sign.payment.request", "search_read", params, (err, records) => {
        if (err) {
          reject(err);
        } else {
          resolve(records);
        }
      });
    });
    prRecords.forEach((pr) => {
      expireDateMap[pr.id] = pr.expire_date || null;
    });
  }

  const enriched = documents.map((doc) => ({
    ...doc,
    expire_date: doc.payment_request ? expireDateMap[doc.payment_request[0]] || null : null,
  }));

  return enriched;
}

async function getDocumentPDF(uid) {
  await connectOdoo();

  const odooResult = await new Promise((resolve, reject) => {
    let params = [];
    params.push([parseInt(uid)]);
    getOdoo().execute_kw("sea.sign.document", "export_sea_sign_document_pdf", params, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });

  if (odooResult && odooResult.url) {
    try {
      const pdfUrl = `https://home.seacorp.vn${odooResult.url}`;
      const response = await axios.get(pdfUrl, { responseType: "arraybuffer" });
      const base64 = Buffer.from(response.data, "binary").toString("base64");
      return {
        url: odooResult.url,
        base64: base64,
      };
    } catch (e) {
      console.error("Failed to fetch PDF buffer in backend", e);
      return odooResult;
    }
  }

  return odooResult;
}

module.exports = {
  getAttachmentByNameSeq,
  getDocuments,
  getDocumentPDF,
};
