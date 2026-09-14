-- 巡检：failed 消息缺少 error_code（DATABASE CHECK 不允许）
SELECT id, conversation_id, created_at
FROM messages
WHERE status = 'failed' AND error_code IS NULL;
