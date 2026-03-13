const express = require('express');
const router  = express.Router();
const {
  getVehicles,
  getVehicle,
  addVehicle,
  editVehicle,
  removeVehicle,
  getRemoved,
  restoreVehicleHandler,
  updateTrakzee,
  bulkSuspendExpired,
} = require('../Controllers/VehicleController');

router.get   ('/',                        getVehicles);          // GET  /api/vehicles
router.get   ('/removed',                 getRemoved);           // GET  /api/vehicles/removed
router.get   ('/:id',                     getVehicle);           // GET  /api/vehicles/:id
router.post  ('/',                        addVehicle);           // POST /api/vehicles
router.patch ('/:id',                     editVehicle);          // PATCH /api/vehicles/:id
router.delete('/:id',                     removeVehicle);        // DELETE /api/vehicles/:id (soft-delete)
router.patch ('/:id/restore',             restoreVehicleHandler);// PATCH /api/vehicles/:id/restore
router.patch ('/:id/trakzee',             updateTrakzee);        // PATCH /api/vehicles/:id/trakzee
router.post  ('/actions/suspend-expired', bulkSuspendExpired);   // POST /api/vehicles/actions/suspend-expired

module.exports = router;
