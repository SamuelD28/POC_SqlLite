export type BaseEntity = {
  id: number;
};

export type Product = BaseEntity & {
  name: string;
  description: string;
  storeId: string;
  store: Store | null;
};

export type Store = BaseEntity & {
  company: string;
  address: string;
};
