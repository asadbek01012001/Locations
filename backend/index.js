const express = require('express');
const cors = require('cors');
require('dotenv').config();

const locationsRouter = require('./routes/locations');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/locations', locationsRouter);

app.listen(PORT, () => {
  console.log(`Backend ishga tushdi: http://localhost:${PORT}`);
});
