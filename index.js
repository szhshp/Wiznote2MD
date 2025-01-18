
const sqlite3 = require("sqlite3").verbose();
const unzipper = require('unzipper');
const fs = require('fs');
var TurndownService = require('turndown')

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
    throw err;
  }
  rows.forEach((row) => {
    const id = row.DOCUMENT_GUID;
    const expectedDir = row.DOCUMENT_LOCATION;
    const file = row.DOCUMENT_TITLE + '.md';

    getContent({ id, expectedDir, file });
  });
});

const getContent = async ({ id, expectedDir, file }) => {
  const originalWizNotesPath = `notes/{${id}}`;

  const exportPath = `export/unzipped/${id}`;
  const finalPath = `final/${expectedDir}${file}`;

  [exportPath, finalPath].forEach((path) => {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
    }
  })

  /**
   * Extract the contents of the zip file
   * and save them to the export directory
   */
  const directory = await unzipper.Open.file(originalWizNotesPath);
  await directory.extract({ path: exportPath });
  console.log('Files successfully extracted');

  /**
   * Convert index.html to markdown
   */
  const htmlPath = `${exportPath}/index.html`;
  const markdownPath = `${exportPath}/index.md`;
  const html = fs.readFileSync(htmlPath, 'utf8');
  const turndownService = new TurndownService();
  try {
    const markdown = turndownService.turndown(html);
    fs.writeFileSync(markdownPath, markdown);
    fs.unlinkSync(htmlPath);
  } catch (err) {
    console.error('Error converting HTML to markdown:', err.message);
  }

  /**
   * Move the folder to the expected directory
   */
  fs.renameSync(exportPath, finalPath);

}
