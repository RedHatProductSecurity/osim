export interface AegisMetaFixture {
  marker: string;
  impact: string;
  aegis_meta: Record<string, unknown[]>;
}

export declare const aegisMetaFixtures: AegisMetaFixture[];

export declare function withAegisMetaFixture<T extends Record<string, unknown>>(flaw: T, id: unknown): T;
