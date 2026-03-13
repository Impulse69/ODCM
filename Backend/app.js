const express = require('express');
const cors    = require('cors');
const pool = require('./Config/db');
const { createTables } = require('./Models/Customer');
const { createPlansTable } = require('./Models/Subscription');
const { createPaymentHistoryTable } = require('./Models/PaymentHistory');
const { createUsersTable, seedDefaultAdmin } = require('./Models/User');
const { executeSmsJob } = require('./Controllers/SmsController');
const customerRouter        = require('./Routers/customerRouter');
const vehicleRouter         = require('./Routers/vehicleRouter');
const subscriptionRouter    = require('./Routers/subscriptionRouter');
const paymentHistoryRouter  = require('./Routers/paymentHistoryRouter');
const bulkImportRouter      = require('./Routers/bulkImportRouter');
const authRouter            = require('./Routers/authRouter');
const smsRouter             = require('./Routers/smsRouter');
const { authenticateToken } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

app.use('/api/auth',      authRouter);
app.use('/api/customers', authenticateToken, customerRouter);
app.use('/api/vehicles',  authenticateToken, vehicleRouter);
app.use('/api/plans',     authenticateToken, subscriptionRouter);
app.use('/api/payments',      authenticateToken, paymentHistoryRouter);
app.use('/api/bulk-import',   authenticateToken, bulkImportRouter);
app.use('/api/sms',           authenticateToken, smsRouter);

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

app.listen(PORT, async () => {
	console.log(`Server started on port ${PORT}`);
	try {
		await createTables();
		await createPlansTable();
		await createPaymentHistoryTable();
		await createUsersTable();
		await seedDefaultAdmin();
		console.log('Database tables synced.');
	} catch (err) {
		console.error('Failed to sync tables:', err.message);
	}
});

// ─── SMS auto-scheduler ────────────────────────────────────────────────────────
// Runs once 30 seconds after startup (to allow DB tables to finish syncing),
// then repeats every hour.
function runScheduledSmsJob() {
	console.log('[SMS Scheduler] Running job...');
	executeSmsJob()
		.then(r => console.log(`[SMS Scheduler] Done — sent:${r.sent} failed:${r.failed} removed:${r.removed} skipped:${r.skipped}`))
		.catch(err => console.error('[SMS Scheduler] Error:', err.message));
}

setTimeout(() => {
	runScheduledSmsJob();
	setInterval(runScheduledSmsJob, 60000); // repeat every 1 minute
}, 30000);
