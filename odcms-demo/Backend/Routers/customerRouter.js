const express = require('express');
const router  = express.Router();
const {
  getIndividuals, getIndividual, addIndividual, editIndividual, removeIndividual,
  getCompanies,   getCompany,   addCompany,   editCompany,   removeCompany,
  getSubscriptions,
  getIndividualSubscriptions, getCompanySubscriptions,
  addSubscription, editSubscription, removeSubscription,
} = require('../Controllers/Customercontroller');

// ── Individuals ───────────────────────────────────────────────────────────────
router.get   ('/individuals',                      getIndividuals);
router.get   ('/individuals/:id',                  getIndividual);
router.post  ('/individuals',                      addIndividual);
router.patch ('/individuals/:id',                  editIndividual);
router.delete('/individuals/:id',                  removeIndividual);
router.get   ('/individuals/:id/subscriptions',    getIndividualSubscriptions);

// ── Companies ─────────────────────────────────────────────────────────────────
router.get   ('/companies',                        getCompanies);
router.get   ('/companies/:id',                    getCompany);
router.post  ('/companies',                        addCompany);
router.patch ('/companies/:id',                    editCompany);
router.delete('/companies/:id',                    removeCompany);
router.get   ('/companies/:id/subscriptions',      getCompanySubscriptions);

// ── Subscriptions (Vehicles) ──────────────────────────────────────────────────
router.get   ('/subscriptions',                    getSubscriptions);
router.post  ('/subscriptions',                    addSubscription);
router.patch ('/subscriptions/:id',                editSubscription);
router.delete('/subscriptions/:id',                removeSubscription);

module.exports = router;
