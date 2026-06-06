import { readFile } from 'node:fs/promises';

const siteHost = 'www.simuladormtc.com';
const siteUrl = `https://${siteHost}`;
const indexNowKey = 'a91756a17ee47448fbc1b6917e2dc8d35a00d28e15a1c80a';
const keyLocation = `${siteUrl}/${indexNowKey}.txt`;
const endpoint = 'https://api.indexnow.org/indexnow';

function extractSitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1].trim())
    .filter((url) => url === siteUrl || url.startsWith(`${siteUrl}/`));
}

async function main() {
  const sitemap = await readFile('public/sitemap.xml', 'utf8');
  const urlList = extractSitemapUrls(sitemap);

  if (urlList.length === 0) {
    throw new Error('No URLs found in public/sitemap.xml for IndexNow submission.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: siteHost,
      key: indexNowKey,
      keyLocation,
      urlList,
    }),
  });

  const body = await response.text();
  console.log(JSON.stringify({
    endpoint,
    status: response.status,
    statusText: response.statusText,
    submittedUrls: urlList.length,
    keyLocation,
    body,
  }, null, 2));

  if (![200, 202].includes(response.status)) {
    throw new Error(`IndexNow submission failed with HTTP ${response.status}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
