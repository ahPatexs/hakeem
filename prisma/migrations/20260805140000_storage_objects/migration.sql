-- Durable object storage for serverless uploads (Vercel)
CREATE TABLE IF NOT EXISTS "StorageObject" (
    "key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "body" BYTEA NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StorageObject_pkey" PRIMARY KEY ("key")
);