import React, { useEffect, useState, useCallback, useContext } from 'react';
import {
  List, Input, Button, Space, Typography, Tag, Divider,
  Tooltip, Badge, Spin, DatePicker, Empty, Popconfirm, message
} from 'antd';
import {
  PlusOutlined, CheckCircleOutlined, MessageOutlined,
  ClockCircleOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { UserContext } from '../../../contexts/UserContext';

dayjs.extend(relativeTime);

const { Text, Paragraph } = Typography;
const BASE = `${process.env.REACT_APP_API_STRING}/crm`;

/* ─── Main Component ─────────────────────────────────────────────────────── */
function OpenPoints({ recordId }) {
  const { user } = useContext(UserContext);
  const [points, setPoints]       = useState([]);
  const [meta, setMeta]           = useState({});
  const [loading, setLoading]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment]     = useState('');
  const [nextDate, setNextDate]   = useState(null);

  const load = useCallback(async () => {
    if (!recordId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${BASE}/customers/${recordId}/open-points`, { withCredentials: true });
      setPoints([...(res.data.open_points || [])].reverse()); // newest first
      setMeta({ days: res.data.days_since_last, stagnant: res.data.is_stagnant });
    } catch (_) {}
    finally { setLoading(false); }
  }, [recordId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (comment.trim().length < 5) { message.warning('Comment must be at least 5 characters.'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${BASE}/customers/${recordId}/open-points`, {
        comment_text: comment.trim(),
        next_action_date: nextDate ? nextDate.toISOString() : null,
        created_by: user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'User',
      }, { withCredentials: true });
      setComment('');
      setNextDate(null);
      message.success('Activity logged.');
      await load();
    } catch (_) {}
    finally { setSubmitting(false); }
  };

  const handleResolve = async (idx) => {
    try {
      // idx in the reversed array → convert back to original index
      const originalIdx = points.length - 1 - idx;
      await axios.patch(
        `${BASE}/customers/${recordId}/open-points/${originalIdx}/resolve`,
        { resolved_by: user?.first_name || 'User' },
        { withCredentials: true }
      );
      message.success('Marked as resolved.');
      await load();
    } catch (_) {}
  };

  const unresolved = points.filter(p => !p.is_resolved).length;

  return (
    <div>
      {/* ── Stagnancy banner ──────────────────────────────────────── */}
      {meta.stagnant && (
        <div style={{
          background: '#fff2e8', border: '1px solid #ffbb96', borderRadius: 8,
          padding: '10px 16px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center'
        }}>
          <ExclamationCircleOutlined style={{ color: '#fa541c', fontSize: 16 }} />
          <Text style={{ color: '#fa541c', fontWeight: 600 }}>
            Stagnant — {meta.days} days since last activity. Add an update!
          </Text>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <MessageOutlined style={{ color: '#1890ff' }} />
          <Text strong>Activity Log</Text>
          {unresolved > 0 && <Badge count={unresolved} style={{ backgroundColor: '#fa8c16' }} />}
        </Space>
        {meta.days != null && !meta.stagnant && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            <ClockCircleOutlined /> Last activity {meta.days === 0 ? 'today' : `${meta.days}d ago`}
          </Text>
        )}
      </div>

      {/* ── Add new comment ───────────────────────────────────────── */}
      <div style={{
        background: '#f8f9fa', border: '1px solid #e8e8e8', borderRadius: 10,
        padding: 16, marginBottom: 20
      }}>
        <Input.TextArea
          rows={3}
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Log an activity, note, or follow-up... (min 5 chars)"
          style={{ marginBottom: 10 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <DatePicker
            value={nextDate}
            onChange={setNextDate}
            placeholder="Next action date (optional)"
            style={{ flex: 1, minWidth: 200 }}
            disabledDate={d => d && d < dayjs().startOf('day')}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            loading={submitting}
            disabled={comment.trim().length < 5}
          >
            Log Activity
          </Button>
        </div>
      </div>

      {/* ── Activity list ─────────────────────────────────────────── */}
      <Spin spinning={loading}>
        {points.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No activity logged yet. Be the first to add a note." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {points.map((p, i) => (
              <div
                key={i}
                style={{
                  background: p.is_resolved ? '#f6ffed' : '#fff',
                  border: `1px solid ${p.is_resolved ? '#b7eb8f' : '#e8e8e8'}`,
                  borderLeft: `4px solid ${p.is_resolved ? '#52c41a' : '#1890ff'}`,
                  borderRadius: 8,
                  padding: '12px 16px',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <Paragraph style={{ margin: 0, fontSize: 14 }}>{p.comment_text}</Paragraph>
                    <Space size={12} style={{ marginTop: 6, flexWrap: 'wrap' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {p.created_by} · {dayjs(p.created_at).fromNow()}
                      </Text>
                      {p.next_action_date && (
                        <Tag
                          color={dayjs(p.next_action_date).isBefore(dayjs()) ? 'error' : 'blue'}
                          icon={<ClockCircleOutlined />}
                          style={{ fontSize: 11 }}
                        >
                          Action: {dayjs(p.next_action_date).format('DD MMM YYYY')}
                        </Tag>
                      )}
                      {p.is_resolved && (
                        <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 11 }}>
                          Resolved · {dayjs(p.resolved_at).format('DD MMM')}
                        </Tag>
                      )}
                    </Space>
                  </div>
                  {!p.is_resolved && (
                    <Tooltip title="Mark as resolved">
                      <Button
                        type="text"
                        size="small"
                        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                        onClick={() => handleResolve(i)}
                      />
                    </Tooltip>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Spin>
    </div>
  );
}

export default OpenPoints;
