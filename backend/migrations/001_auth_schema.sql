CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_status AS ENUM (
    'PENDING_VERIFICATION',
    'IN_REVIEW',
    'ACTIVE',
    'DECLINED',
    'SUSPENDED'
);

CREATE TYPE user_role AS ENUM (
    'USER',
    'AGENT',
    'ADMIN'
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name user_role NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO roles (name) VALUES ('USER'), ('AGENT'), ('ADMIN');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    mobile_number TEXT,
    password_hash TEXT NOT NULL,
    status user_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
    login_attempts INT NOT NULL DEFAULT 0,
    login_locked_until TIMESTAMP NULL,
    email_verified_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

CREATE TABLE sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT,  -- Can be NULL initially, set when refresh token issued
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    device_fingerprint TEXT,
    last_ip TEXT,
    token_family_id UUID NOT NULL,
    parent_token_hash TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_family_id ON sessions(token_family_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_revoked_at ON sessions(revoked_at);

CREATE TABLE email_otp_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    consumed_at TIMESTAMP NULL,
    consumed_by_ip TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_otp_user_id ON email_otp_verifications(user_id);
CREATE INDEX idx_email_otp_expires_at ON email_otp_verifications(expires_at);
CREATE INDEX idx_email_otp_unconsumed ON email_otp_verifications(user_id) WHERE consumed_at IS NULL;

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_address TEXT,
    details JSONB
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

ALTER TABLE users ADD CONSTRAINT chk_login_attempts_positive CHECK (login_attempts >= 0);
ALTER TABLE email_otp_verifications ADD CONSTRAINT chk_otp_attempts_positive CHECK (attempts >= 0);
