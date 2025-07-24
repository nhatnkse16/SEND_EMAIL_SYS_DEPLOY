const express = require('express');
const router = express.Router();
const { getTemplates, addTemplate, deleteTemplate, updateTemplate } = require('../controllers/templateController');

router.get('/', getTemplates);
router.post('/', addTemplate);
router.delete('/:id', deleteTemplate);
router.put('/:id', updateTemplate);

module.exports = router;