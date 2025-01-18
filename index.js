#!/usr/bin/env node

var sqlite3 = require("sqlite3").verbose();
var unzipper = require('unzipper');
var fs = require('fs');
var TurndownService = require('turndown');
var rimraf = require('rimraf');

// Delete /export and /final directories before running anything
rimraf.sync('export');
rimraf.sync('final');

// Open an existing database file
var db = new sqlite3.Database('index.db', function (err) {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Database opened successfully');
  }
});

/**
 * Show all rows in the WIZ_DOCUMENT table
 */
db.all("SELECT * FROM WIZ_DOCUMENT", [], function (err, rows) {
  if (err) {
    console.error('Error fetching rows:', err.message);
    return;
  }
  rows.forEach(function (row) {
    var id = row.DOCUMENT_GUID;
    var expectedDir = row.DOCUMENT_LOCATION;
    var file = row.DOCUMENT_TITLE;

    getContent({ id: id, expectedDir: expectedDir, file: file });
  });
});

var getContent = function (params) {
  var id = params.id;
  var expectedDir = params.expectedDir;
  var file = params.file;
  var originalWizNotesPath = 'notes/{' + id + '}';
  var exportPath = 'export/unzipped/' + id;
  var finalPath = 'final' + expectedDir + file;

  [exportPath, finalPath].forEach(function (path) {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
    }
  });

  unzipper.Open.file(originalWizNotesPath).then(function (directory) {
    return directory.extract({ path: exportPath });
  }).then(function () {
    var htmlPath = exportPath + '/index.html';
    var markdownPath = exportPath + '/index.md';
    var html = fs.readFileSync(htmlPath, 'utf8');
    var turndownService = new TurndownService();
    var markdown = turndownService.turndown(html);
    fs.writeFileSync(markdownPath, markdown);
    fs.unlinkSync(htmlPath);

    fs.renameSync(exportPath, finalPath);
    console.log('Content processed:', finalPath);
  }).catch(function (err) {
    console.error('Error processing content:', err.message);
  });
};
