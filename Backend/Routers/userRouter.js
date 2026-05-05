const express = require('express');
const router = express.Router();
const { listUsers, createUserAccount, updateUserAccount, deleteUserAccount } = require('../Controllers/UserController');

router.get('/', listUsers);
router.post('/', createUserAccount);
router.patch('/:id', updateUserAccount);
router.delete('/:id', deleteUserAccount);

module.exports = router;