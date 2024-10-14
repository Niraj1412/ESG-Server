// server/controllers/esgController.js
const axios = require('axios');
const stringSimilarity = require('string-similarity');
const { Parser } = require('json2csv');
const jsPDF = require('jspdf');
const fs = require('fs');
const csv = require('csv-parser'); // To parse CSV files
const multer = require('multer'); // For file uploads
const path = require('path');

// Setup multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Ensure uploads directory exists
if (!fs.existsSync(__dirname + '/../uploads/')) {
  fs.mkdirSync(__dirname + '/../uploads/');
}

// Function to analyze ESG data with ChatGPT
const analyzeEsgData = async (data) => {
  try {
    const response = await axios.post(
      process.env.GPT_4O_MINI_API_URL,
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: `Analyze the following ESG data: ${JSON.stringify(data)}` },
        ],
        max_tokens: 150,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GPT_4O_MINI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content; // Extract the response
  } catch (error) {
    console.error('Error analyzing ESG data:', error.message);
    throw new Error('Error analyzing ESG data');
  }
};

const processNLPQuery = async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ message: 'Query is required.' });
  }

  try {
    // Step 1: Use the LLM to identify the company name in the query
    const nlpResponse = await axios.post(
      process.env.GPT_4O_MINI_API_URL,
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an ESG data assistant. Extract only the company name from the query.' },
          { role: 'user', content: query },
        ],
        max_tokens: 50,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GPT_4O_MINI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Extract the potential company name from the response
    let extractedText = nlpResponse.data.choices[0].message.content.trim();
    extractedText = extractedText.replace(/[^a-zA-Z0-9.,'&\s]/g, '').trim(); // Clean up the extracted text

    // Step 2: Use the cleaned company name to get the corrected name
    const correctedName = await getCorrectedCompanyName(extractedText);
    if (!correctedName) {
      return res.status(404).json({ message: `No matching company found for "${extractedText}".` });
    }

    // Fetch real-time ESG scores using the corrected company name
    const options = {
      method: 'GET',
      url: 'https://gaialens-esg-scores.p.rapidapi.com/scores',
      params: { companyname: correctedName },
      headers: {
        'x-rapidapi-key': process.env.GAIALENS_API_KEY,
        'x-rapidapi-host': 'gaialens-esg-scores.p.rapidapi.com',
      },
    };

    const esgResponse = await axios.request(options);

    if (Array.isArray(esgResponse.data) && esgResponse.data.length > 0) {
      const esgData = esgResponse.data[0];

      // Safely access the scores
      const environmentalScore = esgData['Environmental Pillar Score'] ?? 'N/A';
      const socialScore = esgData['Social Pillar Score'] ?? 'N/A';
      const governanceScore = esgData['Governance Pillar Score'] ?? 'N/A';
      const overallScore = esgData['Overall Score'] ?? 'N/A';

      // Step 3: Formulate a structured response
      const responseMessage = {
        environmentalScore,
        socialScore,
        governanceScore,
        overallScore,
      };

      return res.status(200).json({ response: responseMessage });
    } else {
      return res.status(404).json({ message: 'No ESG data found for the specified company.' });
    }
  } catch (error) {
    console.error('Error processing NLP query:', error.response ? error.response.data : error.message);
    return res.status(500).json({ message: 'Error processing NLP query', error: error.message });
  }
};




// Fetch all company names using GaiaLens Company Names API
const getCompanyNames = async () => {
  const options = {
    method: 'GET',
    url: 'https://gaialens-company-names.p.rapidapi.com/companynames',
    headers: {
      'x-rapidapi-key': process.env.GAIALENS_API_KEY,
      'x-rapidapi-host': 'gaialens-company-names.p.rapidapi.com',
    },
  };

  try {
    const response = await axios.request(options);
    console.log('Company names fetched:', response.data); // Log company names to check the data

    // Map response data to an array of strings (just the company names)
    const companyNames = response.data.map(item => item.companyname);

    // Check if the data is valid
    if (!Array.isArray(companyNames) || companyNames.length === 0) {
      console.error('No company names received from API.');
      throw new Error('No company names available for correction.');
    }

    return companyNames;
  } catch (error) {
    console.error('Error fetching company names:', error.response ? error.response.data : error.message);
    throw new Error('Error fetching company names');
  }
};



// Suggest the closest company name if the input is incorrect
const getCorrectedCompanyName = async (inputCompanyName) => {
  try {
    const companyNames = await getCompanyNames();

    // Perform the string similarity check
    const bestMatch = stringSimilarity.findBestMatch(inputCompanyName, companyNames);
    console.log('Best match found:', bestMatch.bestMatch); // Log the best match details

    // Return the best match if any match exists
    if (bestMatch.bestMatch && bestMatch.bestMatch.rating > 0) {
      return bestMatch.bestMatch.target;
    } else {
      console.error('No suitable match found for the input company name.');
      return null;
    }
  } catch (error) {
    console.error('Error in company name correction:', error.message);
    throw new Error('Error in company name correction');
  }
};




// Fetch real-time ESG scores with name correction
const getRealTimeESGScores = async (req, res) => {
  let { companyname } = req.query;

  if (!companyname) {
    return res.status(400).json({ message: 'Company name is required.' });
  }

  try {
    // Get the corrected company name
    const correctedName = await getCorrectedCompanyName(companyname);
    if (!correctedName) {
      return res.status(404).json({ message: `No matching company found for "${companyname}".` });
    }

    // Fetch real-time ESG scores using the corrected company name
    const options = {
      method: 'GET',
      url: 'https://gaialens-esg-scores.p.rapidapi.com/scores',
      params: { companyname: correctedName },
      headers: {
        'x-rapidapi-key': process.env.GAIALENS_API_KEY,
        'x-rapidapi-host': 'gaialens-esg-scores.p.rapidapi.com',
      },
    };

    const response = await axios.request(options);
    console.log('ESG Scores:', response.data); // Log the response data to verify

    if (Array.isArray(response.data) && response.data.length > 0) {
      res.status(200).json({ correctedName, ...response.data[0] });
    } else {
      res.status(404).json({ message: 'No ESG data found for the specified company.' });
    }
  } catch (error) {
    console.error('Error fetching ESG scores:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Error fetching ESG scores', error: error.message });
  }
};


// Fetch historical ESG scores by year
const getHistoricalScoresByYear = async (req, res) => {
  const { companyname, year } = req.query;

  if (!companyname || !year) {
    return res.status(400).json({ message: 'Company name and year are required.' });
  }

  const options = {
    method: 'GET',
    url: `https://gaialens-historical-esg-scores.p.rapidapi.com/scores/historical/${year}`,
    params: { companyname },
    headers: {
      'x-rapidapi-key': process.env.GAIALENS_API_KEY,
      'x-rapidapi-host': 'gaialens-historical-esg-scores.p.rapidapi.com',
    },
  };

  try {
    const response = await axios.request(options);
    console.log(response.data);

    if (Array.isArray(response.data) && response.data.length > 0) {
      res.status(200).json(response.data);
    } else {
      res.status(404).json({ message: 'No historical ESG data found for the specified company and year.' });
    }
  } catch (error) {
    console.error('Error fetching historical ESG scores:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Error fetching historical ESG scores', error: error.message });
  }
};

// Upload CSV/XML files
const uploadDataFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  const filePath = req.file.path;
  const fileData = [];

  // Parse the uploaded CSV file
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      fileData.push(row);
    })
    .on('end', async () => {
      try {
        // Analyze the data using ChatGPT
        const insights = await analyzeEsgData(fileData);
        res.status(200).json({ message: 'File uploaded and analyzed successfully.', insights });
      } catch (error) {
        res.status(500).json({ message: 'Error analyzing uploaded data.', error: error.message });
      }
    })
    .on('error', (error) => {
      console.error('Error parsing CSV file:', error.message);
      res.status(500).json({ message: 'Error processing the uploaded file.' });
    });
};

// Export ESG data to CSV
const exportToCSV = async (req, res) => {
  const { data } = req.body;

  try {
    const parser = new Parser();
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment('esg_data.csv');
    return res.send(csv);
  } catch (error) {
    console.error('Error exporting data to CSV:', error.message);
    res.status(500).json({ message: 'Error exporting data to CSV' });
  }
};

// Export ESG data to PDF
const exportToPDF = async (req, res) => {
  const { data } = req.body;

  try {
    const doc = new jsPDF();
    doc.text('ESG Data Report', 10, 10);

    let y = 20;
    data.forEach((item) => {
      doc.text(`Company: ${item.companyname}`, 10, y);
      doc.text(`Year: ${item.Year}`, 10, y + 10);
      doc.text(`Overall Score: ${item['Overall Score']}`, 10, y + 20);
      y += 30;
    });

    const pdfBuffer = doc.output();
    res.header('Content-Type', 'application/pdf');
    res.attachment('esg_data.pdf');
    return res.send(Buffer.from(pdfBuffer, 'binary'));
  } catch (error) {
    console.error('Error exporting data to PDF:', error.message);
    res.status(500).json({ message: 'Error exporting data to PDF' });
  }
};

module.exports = {
  getRealTimeESGScores,
  getHistoricalScoresByYear,
  uploadDataFile: upload.single('file'), 
  exportToCSV,
  exportToPDF,
  processNLPQuery,
};
