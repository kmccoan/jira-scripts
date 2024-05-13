const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const csvParser = require('csv-parser');
const { join } = require('path');

// Function to fetch attachments from the source Jira server
async function fetchAttachments(issueKey, attachmentUrl, auth) {
  console.log(issueKey, 'fetching attachment', attachmentUrl);
  try {
    const response = await axios.get(attachmentUrl, {
      responseType: 'arraybuffer',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/octet-stream',
      },
    });
    console.log(issueKey, 'fetched attachment');
    return response.data;
  } catch (error) {
    console.log(issueKey, 'Error fetching attachment:', JSON.stringify(error));
    return null;
  }
}

// Function to upload attachments to the destination Jira server
async function uploadAttachment(
  issueKey,
  attachmentPath,
  uploadUrl,
  auth,
  attachmentName,
) {
  try {
    console.log(issueKey, 'Uploading:', attachmentPath, 'to', uploadUrl);
    const formData = new FormData();
    formData.append('file', fs.createReadStream(attachmentPath), {
      filename: attachmentName,
    });

    await axios.post(uploadUrl, formData, {
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      headers: {
        Authorization: `Basic ${auth}`,
        'X-Atlassian-Token': 'no-check',
        ...formData.getHeaders(),
      },
    });
    console.log(issueKey, 'Attachment uploaded successfully:', attachmentName);
    fs.unlinkSync(attachmentPath); // Delete temporary file after upload
  } catch (error) {
    console.log(
      issueKey,
      'Error uploading attachment:',
      attachmentName,
      '. Error code:',
      error.code
        ? error.code
        : error.response?.status
        ? error.response.status
        : error,
    );
  }
}

// Create a subfolder for temporary files
const tempFolder = join(__dirname, 'temps');
if (!fs.existsSync(tempFolder)) {
  fs.mkdirSync(tempFolder);
}
console.log(tempFolder);

async function syncAttachments(attachments, issueKey) {
  const sourceAuth ='<todo>'; // Replace with your source Jira Basic authentication credentials
  const destAuth ='<todo>'; // Replace with your destination Jira Basic authentication credentials
  for (const attachment of attachments) {
    const attachmentInfo = attachment.split(';');
    const attachmentUrl = attachmentInfo[3];
    const attachmentName = attachmentInfo[2];

    const attachmentData = await fetchAttachments(
      issueKey,
      attachmentUrl,
      sourceAuth,
    );
    if (attachmentData) {
      const tempFilePath = join(tempFolder, `${attachmentName}`);
      fs.writeFileSync(tempFilePath, attachmentData);
      console.log(`Downloaded: ${issueKey}_${attachmentName}`);
      const uploadUrl = `https://<todo>.atlassian.net/rest/api/3/issue/${issueKey}/attachments`;
      await uploadAttachment(
        issueKey,
        tempFilePath,
        uploadUrl,
        destAuth,
        attachmentName,
      );
    }
  }
  console.log(
    issueKey,
    'had',
    attachments.length,
    'attachments. Transfer completed.',
  );
}

async function processSync() {
  const attachmentInfos = await new Promise((resolve, reject) => {
    const attachmentsToProcess = [];
    fs.createReadStream('JiraExport/Batch1.csv') //Run for every batch. TODO make this script operate from an array
      .pipe(
        csvParser({
          mapHeaders: ({ header, index }) => {
            if (header.startsWith('Attachment')) {
              return `${header}${index}`;
            }
            return header;
          },
        }),
      )
      .on('data', async row => {
        const issueKey = row['Issue key'];
        const attachmentColumns = Object.keys(row).filter(key =>
          key.startsWith('Attachment'),
        );

        const attachments = attachmentColumns
          .map(attachmentColumn => {
            return row[attachmentColumn];
          })
          .filter(attachment => !!attachment);

        if (attachments.length > 0) {
          console.log(
            issueKey,
            'has',
            attachments.length,
            'attachments. Pushing to transfer list.',
          );
          attachmentsToProcess.push({
            issueKey,
            attachments,
          });
        } else {
          console.log(
            issueKey,
            'has',
            attachments.length,
            'attachments. Skipping.',
          );
        }
      })
      .on('end', () => {
        console.log('Processing complete');
        resolve(attachmentsToProcess);
      })
      .on('error', err => {
        console.log('Processing Rejected');
        reject(err);
      });
  });

  console.log(
    'Number of issues to Sync attachments for:',
    attachmentInfos.length,
  );
  let count = 0;
  for (let attachmentInfo of attachmentInfos) {
    await syncAttachments(attachmentInfo.attachments, attachmentInfo.issueKey);
    count++;
    console.log('Number of syncs to go:', attachmentInfos.length - count);
  }
}

processSync();
