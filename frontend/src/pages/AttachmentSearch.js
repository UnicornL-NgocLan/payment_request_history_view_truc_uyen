import { useState, useEffect } from "react";
import { searchAttachments } from "../services/api";
import { useSearchParams } from "react-router-dom";

function AttachmentSearch() {
  const [searchParams] = useSearchParams();
  const [keyword, setKeyword] = useState("");
  const [files, setFiles] = useState([]);
  const [pdfSrc, setPdfSrc] = useState(null);

  const handleSearch = async (value) => {
    const key = value || keyword;

    try {
      const data = await searchAttachments(key);
      setFiles(data);

      if (data.length === 0) {
        setPdfSrc(null);
        alert("Không tìm thấy tài liệu nào với keyword đã nhập");
      }
    } catch (error) {
      alert("Error searching attachments");
    }
  };

  const downloadFile = (file) => {
    const link = document.createElement("a");

    link.href = `data:application/octet-stream;base64,${file.sea_sign_attachment_preview}`;
    link.download = file.sea_sign_attachment_filename_new;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const viewPdf = (file) => {
    const pdfUrl = `data:application/pdf;base64,${file.sea_sign_attachment_preview}`;
    setPdfSrc(pdfUrl);
  };

  // Auto search nếu có keyword trên URL
  useEffect(() => {
    const param = searchParams.get("keyword");

    if (param) {
      setKeyword(param);
      handleSearch(param);
    }
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h2>Search Attachment</h2>

      <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Enter keyword" />

      <button onClick={() => handleSearch()}>Search</button>

      <ul>
        {files.map((file) => (
          <li key={file.id}>
            {file.sea_sign_attachment_filename_new}

            <button onClick={() => viewPdf(file)}>View</button>

            <button onClick={() => downloadFile(file)}>Download</button>
          </li>
        ))}
      </ul>

      {pdfSrc && (
        <div style={{ marginTop: 30 }}>
          <h3>Preview PDF</h3>

          <iframe
            src={pdfSrc}
            width="100%"
            height="700px"
            title="PDF Viewer"
            style={{
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>
      )}
    </div>
  );
}

export default AttachmentSearch;
