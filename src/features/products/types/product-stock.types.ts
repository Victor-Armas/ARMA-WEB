export type StockLevel = "low" | "warning" | "healthy";

export interface SizeStock {
  size: string;
  label: string;
  quantity: number;
}

export interface ColorStock {
  color: string;
  quantity: number;
  sizes: SizeStock[];
}
