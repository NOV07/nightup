export type LegalBlock = string | string[];

export interface LegalSection {
  title: string;
  blocks: LegalBlock[];
}

export interface LegalContent {
  eyebrow: string;
  title: string;
  updated: string;
  sections: LegalSection[];
}
