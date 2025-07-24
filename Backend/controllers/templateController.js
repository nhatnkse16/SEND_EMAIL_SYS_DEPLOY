const Template = require('../models/templateModel');

const getTemplates = async (req, res) => {
    try {
        const templates = await Template.find({}).sort({ createdAt: -1 });
        res.status(200).json(templates);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy templates' });
    }
};

const addTemplate = async (req, res) => {
    try {
        const { name, subject, htmlBody } = req.body;
        const newTemplate = new Template({ name, subject, htmlBody });
        await newTemplate.save();
        res.status(201).json(newTemplate);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi thêm template, có thể tên đã tồn tại' });
    }
};

const deleteTemplate = async (req, res) => {
    try {
        await Template.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Đã xóa template' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi xóa template' });
    }
};

const updateTemplate = async (req, res) => {
    try {
        const { name, subject, htmlBody } = req.body;
        const updated = await Template.findByIdAndUpdate(
            req.params.id,
            { name, subject, htmlBody },
            { new: true }
        );
        if (!updated) return res.status(404).json({ message: 'Không tìm thấy template' });
        res.status(200).json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi cập nhật template' });
    }
};

module.exports = { getTemplates, addTemplate, deleteTemplate, updateTemplate };
