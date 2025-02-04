import { type ZodAffectType } from '@/types';

export enum displayModes {
  ALL = 'All',
  CREATED = 'Created',
  DEFAULT = 'Default',
  DELETED = 'Deleted',
  EDITING = 'Editing',
  MODIFIED = 'Modified',
  SELECTED = 'Selected',
}

export type affectSortKeys = keyof Pick<ZodAffectType,
  'affectedness' | 'cvss_scores' | 'impact' | 'ps_component' | 'ps_module' | 'resolution' | 'trackers'
>;
