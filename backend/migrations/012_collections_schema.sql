-- Migration 012: Collections Schema
-- Creates collections table and junction table for saved properties

CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50) DEFAULT 'rose', -- rose, blue, emerald, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure a user can't have duplicate collection names
CREATE UNIQUE INDEX idx_collections_user_name ON collections(user_id, lower(name));

-- Junction table for items in a collection
CREATE TABLE IF NOT EXISTS collection_items (
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    saved_property_id UUID NOT NULL REFERENCES saved_properties(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (collection_id, saved_property_id)
);

-- Indexes
CREATE INDEX idx_collections_user_id ON collections(user_id);
CREATE INDEX idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX idx_collection_items_saved_property_id ON collection_items(saved_property_id);

COMMENT ON TABLE collections IS 'User-created folders for organizing saved properties';
COMMENT ON TABLE collection_items IS 'Mapping between collections and saved properties';
