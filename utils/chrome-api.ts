const TELEGRAPH_HOSTS = ['telegra.ph', 'graph.org'];

export const getCurrentTelegraphTab = async (): Promise<chrome.tabs.Tab | undefined> => {
  const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return activeTabs.find((tab) =>
    TELEGRAPH_HOSTS.some((host) => (tab.url || '').includes(host + '/'))
  );
};

export const isTelegraphUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url.trim());
    return TELEGRAPH_HOSTS.includes(u.hostname) && u.pathname.length > 1;
  } catch {
    return false;
  }
};
