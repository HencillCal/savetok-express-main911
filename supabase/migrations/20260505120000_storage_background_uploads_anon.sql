-- Allow the Background Remover tool to upload large files from the browser
-- (videos) without sending base64 through Edge Functions (payload limits).

DROP POLICY IF EXISTS "Public read uploads bucket" ON storage.objects;
DROP POLICY IF EXISTS "Anon insert background-uploads" ON storage.objects;

CREATE POLICY "Public read uploads bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'uploads' AND name LIKE 'background-uploads/%');

CREATE POLICY "Anon insert background-uploads"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'uploads'
  AND name LIKE 'background-uploads/%'
);
