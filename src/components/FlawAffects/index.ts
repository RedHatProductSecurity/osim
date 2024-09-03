import { type ZodAffectType } from '@/types';

export enum displayModes {
  ALL = 'All',
  SELECTED = 'Selected',
  EDITING = 'Editing',
  MODIFIED = 'Modified',
  DELETED = 'Deleted',
  CREATED = 'Created',
}

export type affectSortKeys = keyof Pick<ZodAffectType,
  'ps_module' | 'ps_component' | 'trackers' | 'affectedness' | 'resolution' | 'impact' | 'cvss_scores'
>;
