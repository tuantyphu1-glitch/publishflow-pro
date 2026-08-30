export interface StorageUploadParams {
  key: string;
  data: Buffer;
  contentType: string;
}

export interface StorageProvider {
  upload(params: StorageUploadParams): Promise<{ key: string; url: string }>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getUrl(key: string): Promise<string>;
}
