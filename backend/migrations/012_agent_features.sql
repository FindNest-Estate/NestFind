-- Migration 012: Agent Dashboard Features (Schedule & Marketing)

-- 1. Agent Calendar Events (Custom tasks beyond visits)
CREATE TABLE IF NOT EXISTS agent_schedule_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    event_type VARCHAR(50) NOT NULL, -- 'task', 'meeting', 'personal'
    color VARCHAR(20) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_schedule_agent_id ON agent_schedule_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_schedule_start_time ON agent_schedule_events(start_time);

-- 2. Marketing History (Track generated assets)
CREATE TABLE IF NOT EXISTS marketing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id),
    template_id VARCHAR(100) NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    asset_url TEXT NOT NULL,
    asset_type VARCHAR(50) NOT NULL, -- 'flyer', 'social_story', 'video'
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_history_agent_id ON marketing_history(agent_id);
