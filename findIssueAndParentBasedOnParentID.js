const fs = require('fs');
const csv = require('csv-parser');

async function findIssuesWithParentExternalId(csvFilePath, parentExternalId) {
  return await new Promise((resolve, reject) => {
    const issues = [];
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', row => {
        if (row['Parent'] === parentExternalId) {
          issues.push(row['Issue key']);
        }
      })
      .on('end', () => {
        resolve(issues);
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
  // Convert the array of strings to a comma-delimited string
  const commaSeparatedString = parentIssueKeys.join(',');

  // Write the comma-separated string to the file
  fs.writeFile(filename, commaSeparatedString, err => {
    if (err) {
      console.error('Error writing to file:', err);
    } else {
      console.log('Strings have been written to', filename);
    }
  });
}

async function processCSV(allFiles, parentIds, fileToProcess) {
  const allChildrenIssueKeys = [];
  for (let parentId of parentIds) {
    const childrenKeys = await findIssuesWithParentExternalId(
      fileToProcess,
      parentId,
    );
    allChildrenIssueKeys.push(...childrenKeys);
  }

  const parentIssueKeys = [];
  for (let externalId of parentIds) {
    for (let file of allFiles) {
      const parentKey = await findIssueKey(file, externalId);
      if (parentKey) {
        parentIssueKeys.push(parentKey);
        break;
      }
    }
  }

  const missingIssueKeysFilePath = 'JiraImport/missingIssueKeysBatch6.csv';
  writeToFile(
    parentIssueKeys.concat(allChildrenIssueKeys),
    missingIssueKeysFilePath,
  );
}

const allFiles = [
  'JiraImport/Batch1.csv',
  'JiraImport/Batch2.csv',
  'JiraImport/Batch3.csv',
  'JiraImport/Batch4.csv',
  'JiraImport/Batch5.csv',
  'JiraImport/Batch6.csv',
];

const fileToProcess = 'JiraImport/Batch6.csv';
const parentIds = [
  '19457',
  '20047',
  '14089',
  '19731',
  '18986',
  '19382',
  '18742',
];

if (!allFiles.length) {
  console.log('Please provide both CSV file path and configuration file path.');
} else {
  processCSV(allFiles, parentIds, fileToProcess);
}
