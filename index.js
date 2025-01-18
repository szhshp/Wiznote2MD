
const sqlite3 = require("sqlite3").verbose();
const unzipper = require('unzipper');
const fs = require('fs');
const TurndownService = require('turndown');
const rimraf = require('rimraf');

// Delete /export and /final directories before running anything
rimraf.sync('export');
rimraf.sync('final');

// Open an existing database file
const db = new sqlite3.Database('index.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Database opened successfully');
  }
});

/**
 * Show all rows in the WIZ_DOCUMENT table
 */
db.all("SELECT * FROM WIZ_DOCUMENT", [], (err, rows) => {
  if (err) {
    console.error('Error fetching rows:', err.message);
    return;
  }
  rows.forEach((row) => {
    const id = row.DOCUMENT_GUID;
    const expectedDir = row.DOCUMENT_LOCATION;
    const file = row.DOCUMENT_TITLE;

    getContent({ id, expectedDir, file });
  });
});

const getContent = async ({ id, expectedDir, file }) => {
  const originalWizNotesPath = `notes/{${id}}`;
  const exportPath = `export/unzipped/${id}`;
  const finalPath = `final${expectedDir}${file}`;

  [exportPath, finalPath].forEach((path) => {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
    }
  });

  try {
    // Extract the contents of the zip file and save them to the export directory
    const directory = await unzipper.Open.file(originalWizNotesPath);
    await directory.extract({ path: exportPath });

    // Convert index.html to markdown
    const htmlPath = `${exportPath}/index.html`;
    const markdownPath = `${exportPath}/index.md`;
    const html = fs.readFileSync(htmlPath, 'utf8');
    const turndownService = new TurndownService();
    const markdown = turndownService.turndown(html);
    fs.writeFileSync(markdownPath, markdown);
    fs.unlinkSync(htmlPath);

    // Move the folder to the expected directory
    fs.renameSync(exportPath, finalPath);
    console.log('Content processed:', finalPath);
  } catch (err) {
    console.error('Error processing content:', err.message);
  }
};
