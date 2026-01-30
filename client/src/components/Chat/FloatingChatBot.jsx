
import React, { useState, useRef, useEffect } from "react";
import {
    Button,
    Input,
    Card,
    Avatar,
    Typography,
    FloatButton,
    Drawer,
    Spin,
    Tag
} from "antd";
import {
    MessageOutlined,
    SendOutlined,
    CloseOutlined,
    RobotOutlined,
    UserOutlined
} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";

const { TextArea } = Input;
const { Text } = Typography;

const FloatingChatBot = () => {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: "assistant", content: "Hi! I'm your AI assistant. Ask me anything about your shipments." }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, open]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = { role: "user", content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:9003"}/api/ai/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest"
                },
                credentials: "include", // Send cookies for authentication
                body: JSON.stringify({
                    question: input,
                    history: messages.map(m => m.content)
                })
            });

            const data = await response.json();

            if (data.success) {
                setMessages(prev => [...prev, {
                    role: "assistant",
                    content: data.answer,
                    cost: data.cost
                }]);
            } else {
                setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error: " + (data.error || "Unknown error") }]);
            }

        } catch (error) {
            setMessages(prev => [...prev, { role: "assistant", content: "Network error. Please try again later." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <FloatButton
                icon={<MessageOutlined />}
                type="primary"
                style={{ right: 24, bottom: 24, width: 60, height: 60 }}
                onClick={() => setOpen(true)}
            />

            <Drawer
                title="AI Assistant"
                placement="right"
                onClose={() => setOpen(false)}
                open={open}
                width={400}
                mask={false}
                bodyStyle={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}
                headerStyle={{ background: "#f0f2f5" }}
            >
                {/* Messages Area */}
                <div style={{ flex: 1, padding: "16px", overflowY: "auto", background: "#fff", display: "flex", flexDirection: "column", gap: "16px" }}>
                    {messages.map((msg, index) => (
                        <div key={index} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                            <div style={{ maxWidth: "80%", display: "flex", gap: "8px", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                                <Avatar
                                    icon={msg.role === "user" ? <UserOutlined /> : <RobotOutlined />}
                                    style={{ backgroundColor: msg.role === "user" ? "#1890ff" : "#52c41a" }}
                                    size="small"
                                />
                                <div style={{
                                    background: msg.role === "user" ? "#e6f7ff" : "#f6f6f6",
                                    padding: "10px 14px",
                                    borderRadius: "12px",
                                    borderTopRightRadius: msg.role === "user" ? "2px" : "12px",
                                    borderTopLeftRadius: msg.role === "user" ? "12px" : "2px"
                                }}>
                                    <ReactMarkdown components={{
                                        p: ({ node, ...props }) => <p style={{ margin: 0 }} {...props} />
                                    }}>
                                        {msg.content}
                                    </ReactMarkdown>
                                    {msg.cost && (
                                        <div style={{ marginTop: 4, textAlign: "right" }}>
                                            <Tag style={{ fontSize: 9, margin: 0 }} color="orange">${msg.cost}</Tag>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div style={{ display: "flex", justifyContent: "flex-start", paddingLeft: 38 }}>
                            <Spin size="small" />
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div style={{ padding: "16px", borderTop: "1px solid #f0f0f0", background: "#FAFAFA" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <TextArea
                            placeholder="Ask about a shipment..."
                            autoSize={{ minRows: 1, maxRows: 4 }}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onPressEnter={(e) => {
                                if (!e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={handleSend}
                            loading={loading}
                            shape="circle"
                            style={{ flexShrink: 0 }}
                        />
                    </div>
                    <Text type="secondary" style={{ fontSize: "10px", marginTop: "4px", display: "block", textAlign: "center" }}>
                        AI can make mistakes. Check important info.
                    </Text>
                </div>
            </Drawer>
        </>
    );
};

export default FloatingChatBot;
