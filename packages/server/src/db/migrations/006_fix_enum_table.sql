DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'grade_type' AND e.enumlabel = 'lab'
    ) THEN
        ALTER TYPE grade_type ADD VALUE 'lab';
    END IF;
END
$$;