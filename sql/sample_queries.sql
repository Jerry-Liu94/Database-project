-- 1. 查詢某使用者上傳的所有資產
SELECT * FROM asset WHERE uploaded_by_user_id = 1;

-- 2. 查詢資產的最新版本路徑 (MinIO Key)
SELECT a.filename, v.storage_path 
FROM asset a 
JOIN version v ON a.latest_version_id = v.version_id
WHERE a.asset_id = 5;