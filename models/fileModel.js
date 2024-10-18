const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  url: { type: String, required: true },
  public_id: { type: String, required: true },
  size: { type: Number, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  create_date: {
    type: String,
    default: () => {
      const now = new Date();
      return now.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    },
  },
  create_time: {
    type: String,
    default: () => {
      const now = new Date();
      return now.toLocaleString('en-US', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    },
  },
});

module.exports = mongoose.model('File', fileSchema);
