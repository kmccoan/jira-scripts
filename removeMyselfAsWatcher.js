const axios = require('axios');

const accountIdToRemove = '<fill-me-in>';
const jiraBaseUrl = 'https://<todo>.atlassian.net/';

async function removeWatcherFromIssue(issueKey) {
  try {
    const authHeader =
      'Basic <token>';
    const response = await axios.delete(
      `${jiraBaseUrl}/rest/api/3/issue/${issueKey}/watchers?accountId=${accountIdToRemove}`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    );
    console.log(`Watcher removed from issue ${issueKey}`);
  } catch (error) {
    console.log(`Error removing watcher from issue ${issueKey}: ${error}`);
  }
}

async function main() {
  for (let i = 1; i <= 5422; i++) {
    const issueKey = `KEY-${i}`;
    await removeWatcherFromIssue(issueKey);
  }
}

main();
