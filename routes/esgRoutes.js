// server/routes/esgRoutes.js
const express = require('express');
const {
  getRealTimeESGScores,
  getHistoricalScoresByYear,
  uploadDataFile,
  exportToCSV,
  exportToPDF,
  processNLPQuery,
} = require('../controllers/esgController');

const router = express.Router();

// Route to get real-time ESG scores
router.get('/real-time-scores', getRealTimeESGScores);

// Route to get historical ESG scores
router.get('/historical-scores', getHistoricalScoresByYear);

// Route to upload files
router.post('/upload', uploadDataFile);

// Route to export data to CSV
router.post('/export/csv', exportToCSV);

// Route to export data to PDF
router.post('/export/pdf', exportToPDF);

// Route for NLP query processing
router.post('/nlp-query', processNLPQuery);

module.exports = router;
