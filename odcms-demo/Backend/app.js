const express = require('express');
const pool = require('./Config/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Test route to check DB connection
app.get('/api/test-db', async (req, res) => {
	try {
		const result = await pool.query('SELECT NOW()');
		res.json({ success: true, time: result.rows[0].now });
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
});

app.get('/', (req, res) => {
	res.send('Express server is running!');
});

app.listen(PORT, () => {
	console.log(`Server started on port ${PORT}`);
});
