export type Asset = {
  name: string;
  downloadCount: number;
  size: number;
  contentType: string | null;
};

export type Release = {
  tag: string;
  name: string | null;
  publishedAt: string | null;
  draft: boolean;
  prerelease: boolean;
  downloads: number;
  assets: Asset[];
};
