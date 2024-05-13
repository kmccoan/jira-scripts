const fs = require('fs');
const csv = require('csv-parser');

async function mapToParentExternalIds(csvFilePath) {
  return await new Promise((resolve, reject) => {
    const parents = [];
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', row => {
        if (row['Issue Type'] === 'Sub-task') {
          parents.push(row['Parent']);
        }
      })
      .on('end', () => {
        resolve(parents);
      })
      .on('error', err => {
        reject(err);
      });
  });
}

async function findIssueKey(csvFilePath, externalId) {
  return await new Promise((resolve, reject) => {
    let issueKey;
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', row => {
        if (row['Issue id'] === externalId) {
          issueKey = row['Issue key'];
        }
      })
      .on('end', () => {
        resolve(issueKey);
      })
      .on('error', err => {
        reject(err);
      });
  });
}

function deduplicateArray(strings) {
  const uniqueStrings = new Set(strings);
  return Array.from(uniqueStrings);
}

function writeToFile(parentIssueKeys, filename) {
  const commaSeparateParentIssueKeys = parentIssueKeys.join(',');
  fs.writeFile(filename, commaSeparateParentIssueKeys, err => {
    if (err) {
      console.error('Error writing to file:', err);
    } else {
      console.log('Strings have been written to', filename);
    }
  });
}

async function processCSV(csvFilePaths) {
  const allParentExternalIdRows = [];
  for (let file of csvFilePaths) {
    const items = await mapToParentExternalIds(file);
    allParentExternalIdRows.push(...items);
  }

  const deduplicatedParentExternalIdRows = deduplicateArray(
    allParentExternalIdRows,
  );

  const parentIssueKeys = [];
  for (let externalId of deduplicatedParentExternalIdRows) {
    for (let file of csvFilePaths) {
      const issueKey = await findIssueKey(file, externalId);
      if (issueKey) {
        parentIssueKeys.push(issueKey);
        break;
      }
    }
  }

  const parentIssueKeysCSVFile = `JiraImport/allTasksThatHaveSubtasks.csv`;

  writeToFile(parentIssueKeys, parentIssueKeysCSVFile);
}

const allExportBatchesCSVFilePaths = [
  'JiraExport/Batch1.csv',
  'JiraExport/Batch2.csv',
  'JiraExport/Batch3.csv',
  'JiraExport/Batch4.csv',
  'JiraExport/Batch5.csv',
  'JiraExport/Batch6.csv',
];

if (!allExportBatchesCSVFilePaths.length) {
  console.log('Please provide list of all exported batches.');
} else {
  processCSV(allExportBatchesCSVFilePaths);
}
