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
const recipientRoutes = require('./routes/recipientRoutes'); // New import
const templateRoutes = require('./routes/templateRoutes'); // New import
const logRoutes = require('./routes/logRoutes'); // New import

// Use routes
app.use('/api/campaign', campaignRoutes);
app.use('/api/senders', senderRoutes); // Corrected path for senders
app.use('/api/recipients', recipientRoutes); // New route
app.use('/api/templates', templateRoutes); // New route
app.use('/api/logs', logRoutes); // New route

// Basic route for testing
app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`.yellow.bold);
});