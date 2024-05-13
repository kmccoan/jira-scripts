const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

// Function to perform global replacement in CSV data
function replaceUsernames(csvFilePath, configFilePath, tempCsvFilePath) {
  const config = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
  let csvData = fs.readFileSync(csvFilePath, 'utf8');

  // Loop through each username mapping and perform global replacement
  Object.entries(config.usernameMapping).forEach(([username, musername]) => {
    csvData = csvData.replace(new RegExp(username, 'g'), musername);
  });

  fs.writeFileSync(tempCsvFilePath, csvData);
}

function appendHeaderTextToValuesImportedAsComments(
  csvFilePath,
  tempCsvFilePath,
) {
  const transformedData = [];
  const modifiedCsvFilePath = csvFilePath.replace('.csv', '_final.csv');
  const originalHeaders = [];
  fs.createReadStream(tempCsvFilePath)
    .pipe(
      csv({
        mapHeaders: ({ header, index }) => {
          originalHeaders.push(header);
          return `${header}${index}`;
        },
        mapValues: ({ header, index, value }) => {
          if (
            header.includes('Additional details') ||
            header.includes('Analysis Impact') ||
            header.includes('Analysis Type') ||
            header.includes('Challenges') ||
            header.includes('Content type') ||
            header.includes('Issue Severity') ||
            header.includes('Design') ||
            header.includes('Issue Severity') ||
            header.includes('Issue User Reach') ||
            header.includes('Intended Behavior') ||
            header.includes('Intercom/FullStory link') ||
            header.includes('Linked Intercom conversation') ||
            header.includes('Expected behaviour') ||
            header.includes('Impact') ||
            header.includes('Updated') ||
            header.includes('Obtained permission to impers') ||
            header.includes('Paying?') ||
            header.includes('Productboard URL') ||
            header.includes('Purpose for Dooly') ||
            header.includes('Purpose for Users') ||
            header.includes('Reported by a customer') ||
            header.includes('Requesting user') ||
            header.includes('Test plan') ||
            header.includes('T-Shirt Sizing') ||
            header.includes('User Reach') ||
            header.includes('User email or ID') ||
            header.includes('Users Represented')
          ) {
            return value ? `${originalHeaders[index]}: ${value}` : value;
          }
          return value;
        },
      }),
    )
    .on('data', row => {
      transformedData.push(row);
    })
    .on('end', () => {
      const csvWriter = createObjectCsvWriter({
        path: modifiedCsvFilePath,
        header: Object.keys(transformedData[0]).map((header, index) => ({
          id: header,
          title: originalHeaders[index],
        })),
      });

      csvWriter
        .writeRecords(transformedData)
        .then(() => {
          console.log(
            `CSV file has been written successfully for ${csvFilePath}`,
          );
        })
        .catch(err => {
          console.error('Error writing CSV:', err);
        });

      fs.unlinkSync(tempCsvFilePath);
    });
}

function processCSV(csvFilePath, configFilePath) {
  const tempCsvFilePath = csvFilePath.replace('.csv', '_temp.csv');
  replaceUsernames(csvFilePath, configFilePath, tempCsvFilePath);
  appendHeaderTextToValuesImportedAsComments(csvFilePath, tempCsvFilePath);
}

const csvFilePath = 'JiraExport/Batch1.csv'; // Run script for each batch to clean them up.
const configFilePath = 'config.json';

if (!csvFilePath || !configFilePath) {
  console.log('Please provide both CSV file path and configuration file path.');
} else {
  processCSV(csvFilePath, configFilePath);
}
