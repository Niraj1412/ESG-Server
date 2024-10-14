// server/server.js
const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const esgRoutes = require('./routes/esgRoutes');
const nlpRoutes = require('./routes/nlpRoutes');
const errorHandler = require('./middleware/errorHandler');
const cors = require('cors'); 

dotenv.config();
connectDB();

const app = express();

// Enable CORS
app.use(cors({
  origin: 'https://esg-data-analysis.netlify.app/', // Allow only frontend requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Include 'OPTIONS' for preflight requests
  allowedHeaders: ['Content-Type', 'Authorization'], // Specify allowed headers
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use ESG and NLP routes
app.use('/api/esg', esgRoutes);
app.use('/api/nlp', nlpRoutes);

// Error handling middleware
app.use(errorHandler);

// Handle unknown routes (optional, to prevent CORS errors on unknown endpoints)
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
