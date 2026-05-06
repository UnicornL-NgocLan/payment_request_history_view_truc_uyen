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
      "pr_reimbursement_amount",
      "document_status",
      "payment_request",
      "payments_payment_contract",
      "payments_payment_bill",
      "payments_contract_amount",
      "sea_sign_payments",
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
  const prIds = [...new Set(documents.map((doc) => doc.payment_request && doc.payment_request[0]).filter(Boolean))];
  const pIds = [...new Set(documents.map((doc) => doc.sea_sign_payments && doc.sea_sign_payments[0]).filter(Boolean))];
  // Batch fetch expire_date from sea.sign.payment.request
  const prRecords = await new Promise((resolve, reject) => {
    const inParams = [];
    inParams.push([["id", "in", prIds]]);
    inParams.push([
      "id",
      "expire_date",
      "advance_file_id",
      "payments_bill_amount",
      "company_currency",
      "supplier_address",
      "supplier_tax_code",
      "supplier_name",
      "payment_method",
      "acc_holder_name",
      "partner_account_address",
      "account_number",
      "bank_name",
      "bank_address",
      "bic",
    ]);
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

  // Batch fetch from sea.sign.payment
  const paymentsRecords = await new Promise((resolve, reject) => {
    const inParams = [];
    inParams.push([["id", "in", pIds]]);
    inParams.push(["id", "supplier_name", "supplier_address", "supplier_tax_code"]);
    inParams.push(0);
    const params = [];
    params.push(inParams);
    getOdoo().execute_kw("sea.sign.payments", "search_read", params, (err, records) => {
      if (err) {
        reject(err);
      } else {
        resolve(records);
      }
    });
  });

  const enriched = documents.map((doc) => ({
    ...doc,
    expire_date: doc.payment_request ? prRecords.find((pr) => pr.id === doc.payment_request[0]).expire_date || null : null,
    advance_file_id: doc.payment_request ? prRecords.find((pr) => pr.id === doc.payment_request[0]).advance_file_id || null : null,
    company_currency: doc.payment_request ? prRecords.find((pr) => pr.id === doc.payment_request[0]).company_currency || null : null,
    payments_bill_amount: doc.payment_request ? prRecords.find((pr) => pr.id === doc.payment_request[0]).payments_bill_amount || null : null,
    payment_method: doc.payment_request ? prRecords.find((pr) => pr.id === doc.payment_request[0]).payment_method || null : null,
    acc_holder_name: doc.payment_request ? prRecords.find((pr) => pr.id === doc.payment_request[0]).acc_holder_name || null : null,
    partner_account_address: doc.payment_request ? prRecords.find((pr) => pr.id === doc.payment_request[0]).partner_account_address || null : null,
    account_number: doc.payment_request ? prRecords.find((pr) => pr.id === doc.payment_request[0]).account_number || null : null,
    bank_name: doc.payment_request ? prRecords.find((pr) => pr.id === doc.payment_request[0]).bank_name || null : null,
    bank_address: doc.payment_request ? prRecords.find((pr) => pr.id === doc.payment_request[0]).bank_address || null : null,
    bic: doc.payment_request ? prRecords.find((pr) => pr.id === doc.payment_request[0]).bic || null : null,
    supplier_name: doc.sea_sign_payments ? paymentsRecords.find((pr) => pr.id === doc.sea_sign_payments[0]).supplier_name || null : null,
    supplier_address: doc.sea_sign_payments ? paymentsRecords.find((pr) => pr.id === doc.sea_sign_payments[0]).supplier_address || null : null,
    supplier_tax_code: doc.sea_sign_payments ? paymentsRecords.find((pr) => pr.id === doc.sea_sign_payments[0]).supplier_tax_code || null : null,
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
