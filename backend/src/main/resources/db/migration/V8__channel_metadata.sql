-- Add metadata columns to channels table
ALTER TABLE channels ADD COLUMN description TEXT;
ALTER TABLE channels ADD COLUMN image_url TEXT;
ALTER TABLE channels ADD COLUMN admin_id UUID REFERENCES users(id) ON DELETE SET NULL;
