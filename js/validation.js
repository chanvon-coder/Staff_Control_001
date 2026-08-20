/**
 * Staff System Control - Validation Engine
 */

const Validator = {
  /**
   * Validate entire staff record before Save or Update
   * @param {Object} record - The staff record to validate
   * @param {Array} existingRecords - List of all existing staff records
   * @param {Boolean} isUpdate - True if updating existing record
   * @param {Number|String} originalNo - Original record serial number if updating
   * @returns {Object} { isValid: Boolean, errors: Object }
   */
  validate(record, existingRecords = [], isUpdate = false, originalNo = null) {
    const errors = {};

    // 1. Required Fields Check
    if (!record.staffId || !String(record.staffId).trim()) {
      errors.staffId = 'សូមបញ្ចូលអត្តលេខ អពដ (Staff ID is required)';
    }

    if (!record.khmerName || !String(record.khmerName).trim()) {
      if (!record.latinName || !String(record.latinName).trim()) {
        errors.khmerName = 'សូមបញ្ចូលឈ្មោះខ្មែរ ឬឈ្មោះឡាតាំង (Khmer Name is required)';
      }
    }

    // 2. Date Sequence Logic Check (Soft validation)
    const startDate = record.startDate ? new Date(record.startDate) : null;
    const endDate = record.endDate ? new Date(record.endDate) : null;
    const dob = record.dob ? new Date(record.dob) : null;
    const serviceDate = record.serviceStartDate ? new Date(record.serviceStartDate) : null;

    // Check Start Date <= End Date (only if both are valid dates)
    if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      if (startDate > endDate) {
        errors.endDate = 'ថ្ងៃបញ្ចប់ ត្រូវតែធំជាង ឬស្មើថ្ងៃចាប់ផ្តើម (End Date must be >= Start Date)';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors: errors
    };
  }
};