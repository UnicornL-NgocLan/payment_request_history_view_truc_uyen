import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getDocuments, getDocumentPDF, searchAttachments } from "../services/api";
import { Table, Select, Button, Space, Tooltip, Modal, List, Input, Tag, message, DatePicker } from "antd";
import { EyeOutlined, DownloadOutlined, SearchOutlined, FileExcelOutlined } from "@ant-design/icons";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

function DocumentList() {
  const [documents, setDocuments] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [pdfSrc, setPdfSrc] = useState(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [currentDoc, setCurrentDoc] = useState(null);
  const searchInput = useRef(null);
  const navigate = useNavigate();

  const getColumnSearchProps = (dataIndex, title) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Tìm ${title}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <Button type="primary" onClick={() => confirm()} icon={<SearchOutlined />} size="small" style={{ width: 90 }}>
            Tìm
          </Button>
          <Button onClick={() => clearFilters && clearFilters()} size="small" style={{ width: 90 }}>
            Xóa
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? "#1677ff" : undefined }} />,
    onFilter: (value, record) => (record[dataIndex] ? record[dataIndex].toString().toLowerCase().includes(value.toLowerCase()) : ""),
    onFilterDropdownOpenChange: (visible) => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
    },
  });

  const getDateRangeSearchProps = (dataIndex, title) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <DatePicker.RangePicker
          value={selectedKeys[0]}
          onChange={(dates) => setSelectedKeys(dates ? [dates] : [])}
          style={{ marginBottom: 8, display: "flex" }}
          format="DD/MM/YYYY"
        />
        <Space>
          <Button type="primary" onClick={() => confirm()} icon={<SearchOutlined />} size="small" style={{ width: 90 }}>
            Tìm
          </Button>
          <Button
            onClick={() => {
              clearFilters && clearFilters();
              confirm(); // Need to confirm to trigger table reload
            }}
            size="small"
            style={{ width: 90 }}
          >
            Xóa
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? "#1677ff" : undefined }} />,
    onFilter: (value, record) => {
      if (!record[dataIndex] || !value || value.length !== 2) return false;
      const recordDate = dayjs(record[dataIndex]);
      const startDate = value[0].startOf("day");
      const endDate = value[1].endOf("day");
      return recordDate.isAfter(startDate) && recordDate.isBefore(endDate);
    },
  });

  const companyList = [
    { id: 6, name: "CÔNG TY CỔ PHẦN PHÁT TRIỂN NÔNG NGHIỆP HẢI ÂU" },
    { id: 27, name: "CÔNG TY TNHH SEAFARM MEKONG" },
    { id: 26, name: "CÔNG TY TNHH SEAFARM CAO NGUYÊN" },
    { id: 28, name: "CÔNG TY TNHH SEAGULL ADC LÂM ĐỒNG" },
    { id: 15, name: "CÔNG TY TNHH SEAGULL ADC NINH THUẬN" },
    { id: 32, name: "CÔNG TY TNHH SEAFARM LÂM ĐỒNG" },
    { id: 31, name: "CÔNG TY CỔ PHẦN DANNYGREEN VIỆT NAM NAM TRUNG BỘ" },
  ];

  const loadDocuments = async (companyId) => {
    setLoading(true);
    const data = await getDocuments(companyId);
    setDocuments(data);
    setLoading(false);
  };

  const handleView = () => {
    if (!selectedCompany) return;
    loadDocuments(selectedCompany);
  };

  const handleDownLoadPDF = async (uid) => {
    const key = "downloadPDF";
    message.loading({ content: "Đang chuẩn bị file PDF...", key });
    try {
      const data = await getDocumentPDF(uid);
      const url = `https://home.seacorp.vn${data.url}`;
      window.open(url, "_blank");
      message.success({ content: "Đã tải file PDF!", key });
    } catch (error) {
      console.error("Failed to download PDF", error);
      message.error({ content: "Không thể tải file PDF.", key });
    }
  };

  const openDocument = async (doc) => {
    setCurrentDoc(doc);
    setIsModalOpen(true);
    setModalLoading(true);
    try {
      const data = await searchAttachments(doc.name_seq);
      setAttachments(data);
    } catch (error) {
      console.error("Failed to load attachments", error);
    } finally {
      setModalLoading(false);
    }
  };

  const handleViewAttachment = (item) => {
    const filename = (item.sea_sign_attachment_filename_new || "").toLowerCase();
    let mimeType = "application/pdf";

    if (filename.endsWith(".png")) {
      mimeType = "image/png";
    } else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
      mimeType = "image/jpeg";
    } else if (filename.endsWith(".gif")) {
      mimeType = "image/gif";
    }

    setPdfSrc({
      url: `data:${mimeType};base64,${item.sea_sign_attachment_preview}`,
      type: mimeType,
    });
    setIsPdfModalOpen(true);
  };

  const handleDownloadAttachment = async (item) => {
    const key = "downloadAttachment";
    message.loading({ content: "Đang chuẩn bị file tải về...", key });
    try {
      const filename = item.sea_sign_attachment_filename_new;
      const base64Data = item.sea_sign_attachment_preview;

      // Convert base64 to Blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/octet-stream" });

      saveAs(blob, filename);

      // Tải thêm file PDF chính nếu có
      if (currentDoc) {
        try {
          const pdfData = await getDocumentPDF(currentDoc.id);
          if (pdfData && pdfData.url) {
            const pdfUrl = `https://home.seacorp.vn${pdfData.url}`;
            const response = await fetch(pdfUrl);
            const pdfBlob = await response.blob();
            saveAs(pdfBlob, `${currentDoc.name_seq || currentDoc.id}.pdf`);
          }
        } catch (e) {
          console.error("Lỗi khi tải file PDF chính kèm theo", e);
        }
      }

      message.success({ content: "Tải về thành công!", key });
    } catch (error) {
      console.error("Download failed", error);
      message.error({ content: "Tải về thất bại.", key });
    }
  };

  const handlePreviewAttachment = (item) => {
    const filename = (item.sea_sign_attachment_filename_new || "").toLowerCase();
    let mimeType = "";

    if (filename.endsWith(".pdf")) {
      mimeType = "application/pdf";
    } else if (filename.endsWith(".png")) {
      mimeType = "image/png";
    } else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
      mimeType = "image/jpeg";
    } else if (filename.endsWith(".gif")) {
      mimeType = "image/gif";
    }

    if (!mimeType) return; // Chỉ áp dụng cho PDF và hình ảnh

    const base64Data = item.sea_sign_attachment_preview;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const fileURL = URL.createObjectURL(blob);
    window.open(fileURL, "_blank");
  };

  const onSelectChange = (newSelectedRowKeys, newSelectedRows) => {
    setSelectedRowKeys(newSelectedRowKeys);
    setSelectedRows(newSelectedRows);
  };

  const handleBulkDownload = async () => {
    if (selectedRows.length === 0) return;
    setLoading(true);
    const key = "bulkDownload";
    message.loading({ content: "Đang nén và chuẩn bị file tài liệu...", key });
    const zip = new JSZip();

    try {
      for (const doc of selectedRows) {
        // Tạo folder tên theo mã tài liệu hoặc ID
        const folderName = (doc.name_seq || `doc_${doc.id}`).replace(/[/\\?%*:|"<>]/g, "-");
        const folder = zip.folder(folderName);

        // 1. Lấy và nén các file đính kèm (base64)
        const atts = await searchAttachments(doc.name_seq);
        atts.forEach((att) => {
          folder.file(att.sea_sign_attachment_filename_new, att.sea_sign_attachment_preview, { base64: true });
        });

        // 2. Lấy và nén file PDF chính (URL)
        const pdfInfo = await getDocumentPDF(doc.id);
        if (pdfInfo && pdfInfo.url) {
          try {
            const pdfUrl = `https://home.seacorp.vn${pdfInfo.url}`;
            const response = await fetch(pdfUrl);
            const blob = await response.blob();
            folder.file(`${folderName}.pdf`, blob);
          } catch (e) {
            console.error(`Không thể tải file PDF chính cho ${doc.name_seq}`, e);
          }
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `Documents_${new Date().getTime()}.zip`);
      message.success({ content: "Tải về thành công!", key });
      setSelectedRowKeys([]);
      setSelectedRows([]);
    } catch (error) {
      console.error("Tải hàng loạt thất bại", error);
      message.error({ content: "Tải về thất bại, vui lòng thử lại.", key });
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (selectedRows.length === 0) return;

    const statusMap = {
      process: "Đang thực hiện",
      completed: "Hoàn thành",
      approved: "Đã được duyệt",
      canceled: "Bị hủy",
    };

    const data = selectedRows.map((doc) => ({
      Mã: doc.name_seq || "",
      Tên: doc.name || "",
      "Người yêu cầu": Array.isArray(doc.employee_request) ? doc.employee_request[1] : doc.employee_request || "",
      "Nhà cung cấp": doc.pr_supplier_name || "",
      "Ngày gửi": doc.sent_date ? dayjs(doc.sent_date).format("DD/MM/YYYY") : "",
      "Mô tả": doc.document_description || "",
      "Trạng thái": statusMap[doc.status] || doc.status || "",
      "Giai đoạn": doc.document_status || "",
      "Thời hạn thanh toán": doc.expire_date ? dayjs(doc.expire_date).format("DD/MM/YYYY") : "",
      "Số tiền đề nghị thanh toán": doc.pr_remaining_amount ?? "",
      "Hồ sơ thanh toán": Array.isArray(doc.advance_file_id) ? doc.advance_file_id[1] : doc.advance_file_id || "",
      "Số hợp đồng": doc.payments_payment_contract || "",
      "Số hóa đơn": doc.payments_payment_bill || "",
      "Số tiền hợp đồng": doc.payments_contract_amount ?? "",
      "Số tiền hóa đơn": doc.payments_bill_amount ?? "",
      "Tiền tệ": Array.isArray(doc.company_currency) ? doc.company_currency[1] : doc.company_currency || "",
      "Tên bên thụ hưởng": doc.supplier_name || "",
      "Địa chỉ bên thụ hưởng": doc.supplier_address || "",
      "Mã số thuế bên thụ hưởng": doc.supplier_tax_code || "",
      "Phương thức thanh toán": doc.payment_method === "bank" ? "Chuyển khoản" : "Tiền mặt" || "",
      "Tên chủ tài khoản": doc.acc_holder_name || "",
      "Địa chỉ chủ tài khoản": doc.partner_account_address || "",
      "Số tài khoản": doc.account_number || "",
      "Tên ngân hàng": doc.bank_name || "",
      "Địa chỉ ngân hàng": doc.bank_address || "",
      "Mã BIC": doc.bic || "",
      "Số tiền bồi hoàn": doc.pr_reimbursement_amount ?? "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tài liệu");
    XLSX.writeFile(wb, `TaiLieu_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`);
    message.success("Xuất Excel thành công!");
  };

  const columns = [
    {
      title: "Mã",
      dataIndex: "name_seq",
      key: "name_seq",
      width: 140,
      sorter: (a, b) => a.name_seq.localeCompare(b.name_seq),
      ...getColumnSearchProps("name_seq", "mã"),
    },
    {
      title: "Tên",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      ...getColumnSearchProps("name", "tên"),
    },
    {
      title: "Người yêu cầu",
      dataIndex: "employee_request",
      key: "employee_request",
      sorter: (a, b) => (a.employee_request || "").localeCompare(b.employee_request || ""),
      ...getColumnSearchProps("employee_request", "người yêu cầu"),
    },
    {
      title: "Nhà cung cấp",
      dataIndex: "pr_supplier_name",
      key: "pr_supplier_name",
      sorter: (a, b) => (a.pr_supplier_name || "").localeCompare(b.pr_supplier_name || ""),
      ...getColumnSearchProps("pr_supplier_name", "nhà cung cấp"),
    },
    {
      title: "Ngày gửi",
      dataIndex: "sent_date",
      key: "sent_date",
      sorter: (a, b) => new Date(a.sent_date) - new Date(b.sent_date),
      ...getDateRangeSearchProps("sent_date", "ngày"),
    },
    {
      title: "Mô tả",
      dataIndex: "document_description",
      key: "document_description",
      sorter: (a, b) => (a.document_description || "").localeCompare(b.document_description || ""),
      ...getColumnSearchProps("document_description", "mô tả"),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      sorter: (a, b) => a.status.localeCompare(b.status),
      filters: [
        { text: "Đang thực hiện", value: "process" },
        { text: "Hoàn thành", value: "completed" },
        { text: "Đã được duyệt", value: "approved" },
        { text: "Bị hủy", value: "canceled" },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => {
        let color = "default";
        let text = status;

        if (status === "process") {
          color = "blue";
          text = "Đang thực hiện";
        } else if (status === "completed") {
          color = "green";
          text = "Hoàn thành";
        } else if (status === "approved") {
          color = "gold";
          text = "Đã được duyệt";
        } else if (status === "canceled") {
          text = "Bị hủy";
        }

        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: "Giai đoạn",
      dataIndex: "document_status",
      key: "document_status",
      sorter: (a, b) => a.document_status.localeCompare(b.document_status),
      ...getColumnSearchProps("document_status", "giai đoạn"),
    },
    {
      title: "Thời hạn thanh toán",
      dataIndex: "expire_date",
      key: "expire_date",
      sorter: (a, b) => new Date(a.expire_date || 0) - new Date(b.expire_date || 0),
      ...getDateRangeSearchProps("expire_date", "thời hạn thanh toán"),
      render: (value) => (value ? dayjs(value).format("DD/MM/YYYY") : <span style={{ color: "#bbb" }}>—</span>),
    },
    {
      title: "Số tiền đề nghị thanh toán",
      dataIndex: "pr_remaining_amount",
      key: "pr_remaining_amount",
      width: 250,
      align: "right",
      sorter: (a, b) => a.pr_remaining_amount - b.pr_remaining_amount,
      ...getColumnSearchProps("pr_remaining_amount", "số tiền"),
      render: (value) => new Intl.NumberFormat("vi-VN").format(value),
    },
    {
      title: "Hồ sơ",
      dataIndex: "advance_file_id",
      key: "advance_file_id",
      width: 150,
      render: (val) => (Array.isArray(val) ? val[1] : val),
      ...getColumnSearchProps("advance_file_id", "Hồ sơ"),
    },
    {
      title: "Số hợp đồng",
      dataIndex: "payments_payment_contract",
      key: "payments_payment_contract",
      width: 180,
      ...getColumnSearchProps("payments_payment_contract", "Số hợp đồng"),
    },
    {
      title: "Số hóa đơn",
      dataIndex: "payments_payment_bill",
      key: "payments_payment_bill",
      width: 180,
      ...getColumnSearchProps("payments_payment_bill", "Số hóa đơn"),
    },
    {
      title: "Số tiền hợp đồng",
      dataIndex: "payments_contract_amount",
      key: "payments_contract_amount",
      width: 150,
      align: "right",
      render: (val) => (val ? new Intl.NumberFormat("vi-VN").format(val) : ""),
      ...getColumnSearchProps("payments_contract_amount", "số tiền hợp đồng"),
    },
    {
      title: "Số tiền hóa đơn",
      dataIndex: "payments_bill_amount",
      key: "payments_bill_amount",
      width: 150,
      align: "right",
      render: (val) => (val ? new Intl.NumberFormat("vi-VN").format(val) : ""),
      ...getColumnSearchProps("payments_bill_amount", "số tiền hóa đơn"),
    },
    {
      title: "Tiền tệ",
      dataIndex: "company_currency",
      key: "company_currency",
      width: 100,
      render: (val) => (Array.isArray(val) ? val[1] : val),
    },
    {
      title: "Bên thụ hưởng",
      dataIndex: "supplier_name",
      key: "supplier_name",
      width: 180,
      ...getColumnSearchProps("supplier_name", "tên NCC"),
    },
    {
      title: "Địa chỉ BTT",
      dataIndex: "supplier_address",
      key: "supplier_address",
      width: 200,
      ...getColumnSearchProps("supplier_address", "địa chỉ NCC"),
    },
    {
      title: "MST BTT",
      dataIndex: "supplier_tax_code",
      key: "supplier_tax_code",
      width: 120,
      ...getColumnSearchProps("supplier_tax_code", "MST"),
    },
    {
      title: "PT thanh toán",
      dataIndex: "payment_method",
      key: "payment_method",
      width: 150,
      render: (value) => (value === "bank" ? "Chuyển khoản" : "Tiền mặt"),
      ...getColumnSearchProps("payment_method", "PTTT"),
    },
    {
      title: "Chủ TK",
      dataIndex: "acc_holder_name",
      key: "acc_holder_name",
      width: 150,
      ...getColumnSearchProps("acc_holder_name", "chủ TK"),
    },
    {
      title: "Địa chỉ Chủ TK",
      dataIndex: "partner_account_address",
      key: "partner_account_address",
      width: 200,
    },
    {
      title: "Số tài khoản",
      dataIndex: "account_number",
      key: "account_number",
      width: 150,
      ...getColumnSearchProps("account_number", "số TK"),
    },
    {
      title: "Ngân hàng",
      dataIndex: "bank_name",
      key: "bank_name",
      width: 150,
      ...getColumnSearchProps("bank_name", "ngân hàng"),
    },
    {
      title: "Địa chỉ NH",
      dataIndex: "bank_address",
      key: "bank_address",
      width: 200,
    },
    {
      title: "Mã BIC",
      dataIndex: "bic",
      key: "bic",
    },
    {
      title: "Số tiền bồi hoàn",
      dataIndex: "pr_reimbursement_amount",
      key: "pr_reimbursement_amount",
      align: "right",
      render: (val) => (val ? new Intl.NumberFormat("vi-VN").format(val) : ""),
      ...getColumnSearchProps("pr_reimbursement_amount", "số tiền bồi hoàn"),
    },
    {
      title: "Hành động",
      key: "action",
      render: (_, doc) => (
        <Space>
          <Tooltip title="Xem đính kèm">
            <Button type="text" icon={<EyeOutlined />} onClick={() => openDocument(doc)} />
          </Tooltip>
          <Tooltip title="Tải PDF">
            <Button type="text" icon={<DownloadOutlined />} onClick={() => handleDownLoadPDF(doc.id)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 40 }}>
      <h2>Documents</h2>

      <Space style={{ marginBottom: 20 }}>
        <Select
          placeholder="-- Chọn công ty --"
          style={{ width: 400 }}
          value={selectedCompany}
          onChange={(value) => setSelectedCompany(value)}
          options={companyList.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Button type="primary" onClick={handleView} disabled={!selectedCompany} loading={loading}>
          Xem
        </Button>
        {selectedRowKeys.length > 0 && (
          <>
            <Button type="default" onClick={handleBulkDownload} icon={<DownloadOutlined />} loading={loading}>
              Tải xuống đã chọn ({selectedRowKeys.length})
            </Button>
            <Button type="default" onClick={handleExportExcel} icon={<FileExcelOutlined />} style={{ color: "#217346", borderColor: "#217346" }}>
              Xuất Excel ({selectedRowKeys.length})
            </Button>
          </>
        )}
      </Space>

      <Table
        rowSelection={{
          selectedRowKeys,
          onChange: onSelectChange,
        }}
        columns={columns}
        dataSource={documents.map((i) => ({ ...i, employee_request: i.employee_request[1] }))}
        rowKey="id"
        loading={loading}
        pagination={{
          defaultPageSize: 100,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100", "200", "500", "1000"],
          showTotal: (total) => `Tổng cộng ${total} mục`,
        }}
        locale={{
          emptyText: selectedCompany ? "Không có tài liệu nào" : "Vui lòng chọn công ty và bấm Xem",
        }}
        size="middle"
        bordered
      />

      <Modal title="Danh sách đính kèm" open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null} width={600}>
        <List
          loading={modalLoading}
          dataSource={attachments}
          renderItem={(item) => {
            const filename = (item.sea_sign_attachment_filename_new || "").toLowerCase();
            const isPreviewable =
              filename.endsWith(".pdf") ||
              filename.endsWith(".png") ||
              filename.endsWith(".jpg") ||
              filename.endsWith(".jpeg") ||
              filename.endsWith(".gif");

            return (
              <List.Item
                actions={[
                  isPreviewable && (
                    <Button type="link" onClick={() => handlePreviewAttachment(item)}>
                      Xem trước
                    </Button>
                  ),
                  <Button type="link" onClick={() => handleDownloadAttachment(item)}>
                    Tải về
                  </Button>,
                ]}
              >
                <List.Item.Meta title={item.sea_sign_attachment_filename_new} />
              </List.Item>
            );
          }}
        />
      </Modal>

      <Modal
        title="Xem tài liệu"
        open={isPdfModalOpen}
        onCancel={() => {
          setIsPdfModalOpen(false);
          setPdfSrc(null);
        }}
        footer={null}
        width="80%"
        style={{ top: 20 }}
      >
        {pdfSrc && (
          <div style={{ textAlign: "center" }}>
            {pdfSrc.type.startsWith("image/") ? (
              <img src={pdfSrc.url} alt="Preview" style={{ maxWidth: "100%", maxHeight: "750px", objectFit: "contain" }} />
            ) : (
              <iframe src={pdfSrc.url} width="100%" height="750px" title="PDF Viewer" style={{ border: "none" }} />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default DocumentList;
