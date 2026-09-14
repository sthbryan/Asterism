export type LicenseOption = {
  key: string;
  name: string;
};

export type CreateOptions = {
  owners: string[];
  gitignores: string[];
  licenses: LicenseOption[];
};

export type CreateRepoInput = {
  owner: string;
  name: string;
  description: string | null;
  private: boolean;
  addReadme: boolean;
  gitignore: string | null;
  license: string | null;
};

export type CreatedRepo = {
  fullName: string;
  htmlUrl: string;
  private: boolean;
};
