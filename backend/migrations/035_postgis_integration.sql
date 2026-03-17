-- Migration: 035_postgis_integration.sql (MODIFIED DOWNSCALE)
-- Purpose: Optimize geographic proximity searches since PostGIS/earthdistance cannot be installed without superuser.
-- Date: 2026-03-16

-- We will create a composite B-Tree index on latitude and longitude 
-- to speed up bounding-box searches (min_lat, max_lat, min_lng, max_lng).
-- It is not as performant as GIST, but better than full table scans.

CREATE INDEX IF NOT EXISTS idx_properties_lat_lng ON properties(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_properties_lng_lat ON properties(longitude, latitude);
