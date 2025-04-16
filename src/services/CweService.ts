import { osimRuntime } from '@/stores/osimRuntime';
import type { CWEMemberType } from '@/types/mitreCwe';

export const DATA_KEY = 'CWE:API-DATA';
const VERSION_KEY = 'CWE:API-VERSION';

interface CweViews {
  Views: {
    Members: {
      CweID: string;
    }[];
  }[];
}

interface CweCategories {
  Categories: {
    ID: string;
    MappingNotes: {
      Usage: string;
    };
    Name: string;
    Relationships: Array<any>;
    Status: string;
    Summary: string;
  }[];
}

interface CweWeaknesses {
  Weaknesses: {
    Description: string;
    ID: string;
    MappingNotes: {
      Usage: string;
    };
    Name: string;
    Status: string;
  }[];
};

export function loadCweData(): CWEMemberType[] {
  const data = localStorage.getItem(DATA_KEY);
  let cweData: CWEMemberType[] = [];

  try {
    cweData = JSON.parse(data || '[]');
  } catch (e) {
    console.error('CweService:loadCweData() Failed to parse CWE data:', e);
  }

  return cweData;
};

export async function updateCWEData() {
  const baseUrl = osimRuntime.value.backends.mitre;
  try {
    if (!baseUrl) {
      console.debug('No Mitre backed configured, skipping CWE API cache update.');
      return;
    }

    const [version, isNew] = await checkNewVersion(baseUrl);
    if (!isNew) {
      console.debug('✅ CWE API cache is up-to-date.');
      return;
    }

    fetchAndCache(baseUrl);

    localStorage.setItem(VERSION_KEY, version);
  } catch (error) {
    console.error('CweService::fetchAndCacheAPI() Error getting CWE data', error);
  }
}

async function checkNewVersion(baseUrl: string): Promise<[string, boolean]> {
  const version = await fetch(`${baseUrl}/cwe/version`);

  if (!version.ok) {
    throw new Error('Failed to fetch CWE version data');
  }

  const versionData = await version.json();
  const storedVersion = localStorage.getItem(VERSION_KEY);

  const isNew = storedVersion !== versionData.ContentVersion;
  return [versionData.ContentVersion, isNew];
}

async function fetchAndCache(baseUrl: string) {
  const cweView = await fetchCweView(baseUrl);
  const cweCategories = await fetchCweCategories(baseUrl, cweView);
  const cweWeaknesses = await fetchCweWeaknesses(baseUrl, cweCategories);
  localStorage.setItem(DATA_KEY, JSON.stringify(cweWeaknesses));
  console.debug('✅ CWE API cache updated.');
}

async function fetchCweView(baseUrl: string) {
  // 699 is the id for the "Software Development" CWE view
  const view = await fetch(`${baseUrl}/cwe/view/699`);
  if (!view.ok) {
    throw new Error('Failed to fetch CWE OpenAPI data');
  }
  const cweData: CweViews = await view.json();
  const cweCategoryIds = cweData.Views[0].Members.map(member => member.CweID);
  return cweCategoryIds;
}

async function fetchCweCategories(baseUrl: string, cweCategoryIds: string[]) {
  const response = await fetch(`${baseUrl}/cwe/category/${cweCategoryIds.join(',')}`);
  if (!response.ok) {
    throw new Error('Failed to fetch CWE categories data');
  }

  const cweCategoryData: CweCategories = await response.json();
  const cweWeaknessIds = cweCategoryData.Categories.flatMap(member =>
    member.Relationships.map(relationship => relationship.CweID),
  );
  return cweWeaknessIds;
}

async function fetchCweWeaknesses(baseUrl: string, cweIds: string[]) {
  const response = await fetch(`${baseUrl}/cwe/weakness/${cweIds.join(',')}`);
  if (!response.ok) {
    throw new Error('Failed to fetch detailed CWE data');
  }

  const cweWeaknessesData: CweWeaknesses = await response.json();
  const cweWeaknesses: CWEMemberType[] = cweWeaknessesData.Weaknesses.map(weakness => ({
    id: weakness.ID,
    name: weakness.Name,
    status: weakness.Status,
    summary: weakness.Description,
    usage: weakness.MappingNotes.Usage,
  }));
  return cweWeaknesses;
}
