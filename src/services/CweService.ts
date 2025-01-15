import { osimRuntime } from '@/stores/osimRuntime';
import type { CWEMemberType } from '@/types/mitreCwe';

const DATA_KEY = 'CWE:API-DATA';
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
    Name: string;
  }[];
}

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
  const cweIds = await fetchCweIds(baseUrl);
  const cweData = await fetchCweNames(baseUrl, cweIds);
  localStorage.setItem(DATA_KEY, JSON.stringify(cweData));
  console.debug('✅ CWE API cache updated.');
}

async function fetchCweIds(baseUrl: string) {
  // 699 is the id for the "Software Development" CWE view
  const view = await fetch(`${baseUrl}/cwe/view/699`);
  if (!view.ok) {
    throw new Error('Failed to fetch CWE OpenAPI data');
  }
  const cweData: CweViews = await view.json();
  const cweIds = cweData.Views[0].Members.map(member => member.CweID);
  return cweIds;
}

async function fetchCweNames(baseUrl: string, cweIds: string[]) {
  const detailedResponse = await fetch(`${baseUrl}/cwe/category/${cweIds.join(',')}`);
  if (!detailedResponse.ok) {
    throw new Error('Failed to fetch detailed CWE data');
  }

  const detailedData: CweCategories = await detailedResponse.json();
  const customStructure: CWEMemberType[] = detailedData.Categories.map(category => ({
    id: category.ID,
    name: category.Name,
  }));
  return customStructure;
}
