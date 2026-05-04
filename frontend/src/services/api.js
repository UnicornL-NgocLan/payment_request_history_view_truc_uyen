import axios from "axios";

export const getDocuments = async (companyId) => {
  const res = await axios.get("/api/documents?company_id=" + companyId);
  return res.data;
};

export const searchAttachments = async (keyword) => {
  const res = await axios.get("/api/attachments", {
    params: { keyword },
  });

  return res.data;
};

export const getDocumentPDF = async (keyword) => {
  const res = await axios.get("/api/documents/pdf", {
    params: { keyword },
  });

  return res.data;
};

export const loginToOdoo = async (username, password) => {
  const res = await axios.post("/api/login", { username, password });
  return res.data;
};

