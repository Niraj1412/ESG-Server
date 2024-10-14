// server/controllers/nlpController.js
const axios = require('axios');

const processNLPQuery = async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ message: 'Query is required' });
  }

  try {
    const apiUrl = 'https://api.nlp-service.com/process';
    const response = await axios.post(apiUrl, { query }, {
      headers: {
        'Authorization': `Bearer ${process.env.NLP_API_KEY}`
      }
    });

    if (response.data) {
      res.status(200).json(response.data);
    } else {
      res.status(404).json({ message: 'No response from NLP API' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error processing NLP query', error: error.message });
  }
};

module.exports = { processNLPQuery };
