-- Create canvases table for storing canvas state
CREATE TABLE IF NOT EXISTS canvases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Untitled Canvas',
    nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    edges JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster listing
CREATE INDEX IF NOT EXISTS idx_canvases_created_at ON canvases(created_at DESC);

-- Enable Row Level Security (optional - for production use)
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all operations for now (adjust for production)
CREATE POLICY "Allow all operations" ON canvases
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_canvases_updated_at ON canvases;
CREATE TRIGGER update_canvases_updated_at
    BEFORE UPDATE ON canvases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

