require('dotenv').config();

const express = require('express');
const cors = require('cors');
const networkRoutes = require('./routes/networkRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'Wi-Fi Scanner backend',
    status: 'running'
  });
});
app.use('/api/network', networkRoutes);
app.use('/api/ai', aiRoutes);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.publicMessage || 'The request could not be completed.'
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Wi-Fi Scanner backend running on port ${port}`);
  });
}

module.exports = app;
