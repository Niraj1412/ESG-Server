// server/routes/nlpRoutes.js
const express = require('express');
const { processNLPQuery } = require('../controllers/nlpController');

const router = express.Router();

// Route to process NLP queries
router.post('/', processNLPQuery);

module.exports = router;
