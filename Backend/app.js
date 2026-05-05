const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const pool = require('./Config/db');
const { createTables } = require('./Models/Customer');
const { createPlansTable } = require('./Models/Subscription');
const { createPaymentHistoryTable } = require('./Models/PaymentHistory');
const { createUsersTable, seedDefaultAdmin } = require('./Models/User');
const { createInventoryTables } = require('./Models/Inventory');
const { createAuditLogsTable } = require('./Models/AuditLog');
const { executeSmsJob } = require('./Controllers/SmsController');
const customerRouter        = require('./Routers/customerRouter');
const vehicleRouter         = require('./Routers/vehicleRouter');
const subscriptionRouter    = require('./Routers/subscriptionRouter');
const paymentHistoryRouter  = require('./Routers/paymentHistoryRouter');
const bulkImportRouter      = require('./Routers/bulkImportRouter');
const authRouter            = require('./Routers/authRouter');
const smsRouter             = require('./Routers/smsRouter');
const inventoryRouter       = require('./Routers/inventoryRouter');
const userRouter            = require('./Routers/userRouter');
const auditLogRouter        = require('./Routers/auditLogRouter');
const { authenticateToken, requireSuperAdmin } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(helmet());
app.use(express.json());

app.use('/api/auth',          authRouter);
app.use('/api/customers',     authenticateToken, customerRouter);
app.use('/api/vehicles',      authenticateToken, vehicleRouter);
app.use('/api/plans',         authenticateToken, subscriptionRouter);
app.use('/api/payments',      authenticateToken, paymentHistoryRouter);
app.use('/api/bulk-import',   authenticateToken, bulkImportRouter);
app.use('/api/sms',           authenticateToken, smsRouter);
app.use('/api/inventory',     authenticateToken, inventoryRouter);
app.use('/api/users',         authenticateToken, requireSuperAdmin, userRouter);
app.use('/api/audit-logs',    authenticateToken, requireSuperAdmin, auditLogRouter);

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
		await createInventoryTables();
		await createAuditLogsTable();
		// await seedDefaultAdmin();
		console.log('Database tables synced.');
	} catch (err) {
		console.error('Failed to sync tables:', err.message);
	}
});

// ─── SMS auto-scheduler ────────────────────────────────────────────────────────
// Runs every hour to check for due soon and expired vehicles.
// The shorter interval reduces the chance of missing a reminder window.
function runScheduledSmsJob() {
	console.log(`[SMS Scheduler] Starting job check at ${new Date().toISOString()}...`);
	executeSmsJob()
		.then(r => console.log(`[SMS Scheduler] Finished — sent:${r.sent} failed:${r.failed} removed:${r.removed} skipped:${r.skipped}`))
		.catch(err => console.error('[SMS Scheduler] Job Error:', err.message));
}

// Initial run after tables sync (60s delay to let server stabilize)
setTimeout(() => {
	runScheduledSmsJob();
	// Run every hour (60 * 60 * 1000)
	setInterval(runScheduledSmsJob, 3600000);
}, 60000);
