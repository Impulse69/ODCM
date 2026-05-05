const {
  // Individuals
  getAllIndividuals,
  getIndividualById,
  createIndividual,
  updateIndividual,
  deleteIndividual,
  // Companies
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  // Subscriptions
  getAllSubscriptions,
  getSubscriptionsByIndividual,
  getSubscriptionsByCompany,
  createSubscription,
  updateSubscription,
  deleteSubscription,
} = require('../Models/Customer');

const { recordAuditLog } = require('../Models/AuditLog');

// ─── Helper ───────────────────────────────────────────────────────────────────

function generateId(prefix, name) {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${rand}`;
}

// ─── Individual Customers ─────────────────────────────────────────────────────

// GET /api/customers/individuals
async function getIndividuals(req, res) {
  try {
    const data = await getAllIndividuals();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/customers/individuals/:id
async function getIndividual(req, res) {
  try {
    const customer = await getIndividualById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Individual not found.' });
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/customers/individuals
async function addIndividual(req, res) {
  try {
    const { name, phone, contact_person, email, address, city, postal_code } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'name and phone are required.' });
    }
    const customerModel = require('../Models/Customer');
    // Duplicate check for phone
    const existingPhone = await customerModel.findIndividualByPhone(phone);
    if (existingPhone) {
      return res.status(409).json({ success: false, message: 'An individual with this phone already exists.' });
    }
    // Duplicate check for name
    const existingName = await customerModel.findIndividualByName(name);
    if (existingName) {
      return res.status(409).json({ success: false, message: 'An individual with this name already exists.' });
    }
    const id = generateId('CUST', name);
    const customer = await createIndividual({ id, name, phone, contact_person, email, address, city, postal_code });

    await recordAuditLog({
      actorUserId: req.user?.id,
      actorName: req.user?.name || req.user?.email || 'System',
      actorEmail: req.user?.email,
      actorRole: req.user?.role,
      action: 'CREATE',
      entityType: 'Individual Customer',
      entityId: id,
      section: 'Customers',
      title: `Added Individual: ${name}`,
      afterData: customer,
    });

    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/customers/individuals/:id
async function editIndividual(req, res) {
  try {
    const updated = await updateIndividual(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Individual not found.' });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/customers/individuals/:id
async function removeIndividual(req, res) {
  try {
    const customer = await getIndividualById(req.params.id);
    await deleteIndividual(req.params.id);

    if (customer) {
      await recordAuditLog({
        actorUserId: req.user?.id,
        actorName: req.user?.name || req.user?.email || 'System',
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        action: 'DELETE',
        entityType: 'Individual Customer',
        entityId: req.params.id,
        section: 'Customers',
        title: `Deleted Individual: ${customer.name}`,
        beforeData: customer,
      });
    }

    res.json({ success: true, message: 'Individual deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── Companies ────────────────────────────────────────────────────────────────

// GET /api/customers/companies
async function getCompanies(req, res) {
  try {
    const data = await getAllCompanies();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/customers/companies/:id
async function getCompany(req, res) {
  try {
    const company = await getCompanyById(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });
    res.json({ success: true, data: company });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/customers/companies
async function addCompany(req, res) {
  try {
    const { company_name, billing_contact_name, contact_phone, email, address, city, postal_code, tax_id, status, total_accounts } = req.body;
    if (!company_name) {
      return res.status(400).json({ success: false, message: 'company_name is required.' });
    }
    const customerModel = require('../Models/Customer');
    // Duplicate check for company_name only
    const existingName = await customerModel.findCompanyByName(company_name);
    if (existingName) {
      return res.status(409).json({ success: false, message: 'A company with this name already exists.' });
    }
    const id = generateId('CO', company_name);
    const company = await createCompany({ id, company_name, billing_contact_name, contact_phone, email, address, city, postal_code, tax_id, status, total_accounts });

    await recordAuditLog({
      actorUserId: req.user?.id,
      actorName: req.user?.name || req.user?.email || 'System',
      actorEmail: req.user?.email,
      actorRole: req.user?.role,
      action: 'CREATE',
      entityType: 'Company Customer',
      entityId: id,
      section: 'Customers',
      title: `Added Company: ${company_name}`,
      afterData: company,
    });

    res.status(201).json({ success: true, data: company });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/customers/companies/:id
async function editCompany(req, res) {
  try {
    const updated = await updateCompany(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Company not found.' });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/customers/companies/:id
async function removeCompany(req, res) {
  try {
    const company = await getCompanyById(req.params.id);
    await deleteCompany(req.params.id);

    if (company) {
      await recordAuditLog({
        actorUserId: req.user?.id,
        actorName: req.user?.name || req.user?.email || 'System',
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        action: 'DELETE',
        entityType: 'Company Customer',
        entityId: req.params.id,
        section: 'Customers',
        title: `Deleted Company: ${company.company_name}`,
        beforeData: company,
      });
    }

    res.json({ success: true, message: 'Company deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── Subscriptions (Vehicles) ─────────────────────────────────────────────────

// GET /api/customers/subscriptions
async function getSubscriptions(req, res) {
  try {
    const data = await getAllSubscriptions();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/customers/individuals/:id/subscriptions
async function getIndividualSubscriptions(req, res) {
  try {
    const data = await getSubscriptionsByIndividual(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/customers/companies/:id/subscriptions
async function getCompanySubscriptions(req, res) {
  try {
    const data = await getSubscriptionsByCompany(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/customers/subscriptions
async function addSubscription(req, res) {
  try {
    const {
      plate_number, imei, plan, monthly_amount, expiry_date,
      installation_date, status, trakzee_status,
      individual_customer_id, company_id,
    } = req.body;

    // Validate required fields
    if (!plate_number || !imei || !plan || !monthly_amount || !expiry_date) {
      return res.status(400).json({
        success: false,
        message: 'plate_number, imei, plan, monthly_amount, and expiry_date are required.',
      });
    }
    // Must belong to exactly one owner
    if ((!individual_customer_id && !company_id) || (individual_customer_id && company_id)) {
      return res.status(400).json({
        success: false,
        message: 'Exactly one of individual_customer_id or company_id must be provided.',
      });
    }

    const id = generateId('SUB', plate_number);
    const subscription = await createSubscription({
      id, plate_number, imei, plan, monthly_amount, expiry_date,
      installation_date, status, trakzee_status,
      individual_customer_id: individual_customer_id ?? null,
      company_id: company_id ?? null,
    });
    res.status(201).json({ success: true, data: subscription });
  } catch (err) {
    // Unique IMEI violation
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'A subscription with this IMEI already exists.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/customers/subscriptions/:id
async function editSubscription(req, res) {
  try {
    const updated = await updateSubscription(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Subscription not found.' });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/customers/subscriptions/:id
async function removeSubscription(req, res) {
  try {
    await deleteSubscription(req.params.id);
    res.json({ success: true, message: 'Subscription deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  // Individuals
  getIndividuals,
  getIndividual,
  addIndividual,
  editIndividual,
  removeIndividual,
  // Companies
  getCompanies,
  getCompany,
  addCompany,
  editCompany,
  removeCompany,
  // Subscriptions
  getSubscriptions,
  getIndividualSubscriptions,
  getCompanySubscriptions,
  addSubscription,
  editSubscription,
  removeSubscription,
};
