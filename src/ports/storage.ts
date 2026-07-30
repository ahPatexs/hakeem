export interface StorageUploadInput {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}

export interface StorageDownloadResult {
  body: Buffer;
  contentType: string;
  byteSize: number;
}

export interface StoragePort {
  upload(input: StorageUploadInput): Promise<{ key: string }>;
  download(key: string): Promise<StorageDownloadResult>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
