
import React from 'react';
import { Card, Statistic, Row, Col, Table, Typography } from 'antd';
import { DollarOutlined, MessageOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Title } = Typography;

// Mock Data for now
const dataSource = [
    { key: '1', date: '2024-05-14', user: 'Admin', query: 'Status of Job 101?', tokens: 450, cost: '$0.00135' },
    { key: '2', date: '2024-05-14', user: 'Logistics Mgr', query: 'Show demurrage costs', tokens: 820, cost: '$0.00246' },
];

const columns = [
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'User', dataIndex: 'user', key: 'user' },
    { title: 'Query Snippet', dataIndex: 'query', key: 'query' },
    { title: 'Tokens Approx', dataIndex: 'tokens', key: 'tokens' },
    { title: 'Est. Cost', dataIndex: 'cost', key: 'cost' },
];

const AICosting = () => {
    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>AI Usage & Costing</Title>

            <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="Total Cost (This Month)"
                            value={11.28}
                            precision={2}
                            valueStyle={{ color: '#cf1322' }}
                            prefix={<DollarOutlined />}
                            suffix="USD"
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="Total Queries"
                            value={93}
                            prefix={<MessageOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="Avg Response Time"
                            value={1.2}
                            suffix="s"
                            prefix={<ClockCircleOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            <Card title="Recent Usage Logs">
                <Table dataSource={dataSource} columns={columns} pagination={false} />
            </Card>
        </div>
    );
};

export default AICosting;
