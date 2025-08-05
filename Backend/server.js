const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const colors = require('colors'); // Make sure 'colors' is installed if used for console logs

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(express.json()); // For parsing application/json
app.use(cors()); // Enable CORS

// Import routes
const campaignRoutes = require('./routes/campaignRoutes');
const senderRoutes = require('./routes/senderRoutes');
const recipientRoutes = require('./routes/recipientRoutes');
const templateRoutes = require('./routes/templateRoutes');
const logRoutes = require('./routes/logRoutes');
const emailRoutes = require('./routes/emailRoutes'); // New email routes

// Use routes
app.use('/api/campaign', campaignRoutes);
app.use('/api/senders', senderRoutes);
app.use('/api/recipients', recipientRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/emails', emailRoutes); // New email routes

// Basic route for testing
app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`.yellow.bold);
});