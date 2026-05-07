CREATE TABLE notification_broadcasts (
    id             BIGSERIAL PRIMARY KEY,
    title          VARCHAR(512) NOT NULL,
    body           TEXT,
    status         VARCHAR(32)  NOT NULL,
    audience       VARCHAR(32)  NOT NULL,
    created_by     BIGINT NOT NULL REFERENCES app_users (id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at   TIMESTAMPTZ,
    CONSTRAINT ck_notification_broadcasts_status CHECK (status IN ('DRAFT', 'PUBLISHED')),
    CONSTRAINT ck_notification_broadcasts_audience CHECK (audience IN ('ALL_ADHERENTS', 'ALL_USERS'))
);

CREATE INDEX idx_notification_broadcasts_status ON notification_broadcasts (status);

ALTER TABLE notifications
    ADD COLUMN broadcast_id BIGINT REFERENCES notification_broadcasts (id);

CREATE INDEX idx_notifications_broadcast ON notifications (broadcast_id);
