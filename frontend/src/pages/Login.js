import { useState } from "react";
import { Form, Input, Button, Card, Typography, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { loginToOdoo } from "../services/api";

const { Title } = Typography;

function Login({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await loginToOdoo(values.username, values.password);
      if (res && res.message === "Đăng nhập thành công") {
        message.success("Đăng nhập thành công!");
        onLoginSuccess(); // Cho phép vào DocumentList
      } else {
        message.error("Đăng nhập thất bại.");
      }
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      message.error(error.response?.data?.error || "Đăng nhập thất bại, vui lòng kiểm tra lại tài khoản.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#f0f2f5" }}>
      <Card style={{ width: 400, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>
            Đăng nhập Odoo
          </Title>
        </div>

        <Form name="login_form" onFinish={onFinish} layout="vertical">
          <Form.Item name="username" rules={[{ required: true, message: "Vui lòng nhập tài khoản!" }]}>
            <Input prefix={<UserOutlined />} placeholder="Tài khoản (Mã SC)" size="large" />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" size="large" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default Login;
