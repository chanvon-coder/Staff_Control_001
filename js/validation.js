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
    if (!record.staffId || !record.staffId.trim()) {
      errors.staffId = 'សូមបញ្ចូលអត្តលេខ អពដ (Staff ID is required)';
    }

    if (!record.khmerName || !record.khmerName.trim()) {
      if (!record.latinName || !record.latinName.trim()) {
        errors.khmerName = 'សូមបញ្ចូលឈ្មោះខ្មែរ ឬឈ្មោះឡាតាំង (Khmer Name is required)';
      }
    }

    // 2. Duplicate Staff ID Check (Allowed: A staff member can have multiple request records over time)
    // Duplicate ID is handled smoothly via VLOOKUP auto-fill without blocking registration.

    // 3. Date Sequence Logic Check
    const reqDate = record.requestDate ? new Date(record.requestDate) : null;
    const startDate = record.startDate ? new Date(record.startDate) : null;
    const endDate = record.endDate ? new Date(record.endDate) : null;
    const dob = record.dob ? new Date(record.dob) : null;
    const serviceDate = record.serviceStartDate ? new Date(record.serviceStartDate) : null;

    // Check Start Date <= End Date
    if (startDate && endDate && !isNaN(startDate) && !isNaN(endDate)) {
      if (startDate > endDate) {
        errors.endDate = 'ថ្ងៃខែបញ្ចប់ ត្រូវតែធំជាង ឬស្មើថ្ងៃចាប់ផ្តើម (End Date must be >= Start Date)';
      }
    }

    // Check Request Date <= Start Date
    if (reqDate && startDate && !isNaN(reqDate) && !isNaN(startDate)) {
      if (reqDate > startDate) {
        errors.startDate = 'ថ្ងៃខែចាប់ផ្តើម ត្រូវតែក្រោយថ្ងៃស្នើសុំ (Start Date must be >= Request Date)';
      }
    }

    // Check DOB <= Service Start Date
    if (dob && serviceDate && !isNaN(dob) && !isNaN(serviceDate)) {
      if (dob >= serviceDate) {
        errors.serviceStartDate = 'ថ្ងៃខែបម្រើការងារ ត្រូវតែក្រោយថ្ងៃកំណើត (Service Start Date must be after DOB)';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors: errors
    };
  }
};
