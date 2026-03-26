UPDATE spaces
SET is_default_public_entry = false
WHERE is_default_public_entry = true
  AND COALESCE(access_mode, 'private') <> 'public_readonly';

WITH ranked_defaults AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
    FROM spaces
    WHERE is_default_public_entry = true
)
UPDATE spaces AS s
SET is_default_public_entry = false
FROM ranked_defaults AS ranked
WHERE s.id = ranked.id
  AND ranked.rn > 1;

ALTER TABLE spaces
    ADD CONSTRAINT spaces_default_public_entry_requires_public
    CHECK (NOT is_default_public_entry OR access_mode = 'public_readonly');

CREATE UNIQUE INDEX spaces_single_default_public_entry_idx
    ON spaces ((1))
    WHERE is_default_public_entry;
