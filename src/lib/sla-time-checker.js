/**
 * Checks if a given UTC time is within SLA working hours
 * @param {string} utcTimeString - UTC time in format "DD/MM/YYYY HH:MM"
 * @param {Object} slaConfig - SLA configuration object
 * @returns {true|string} - Returns true if within working hours, or next working time as "DD/MM/YYYY HH:MM"
 */
function checkSLAWorkingTime(utcTimeString, slaConfig) {
    // Parse the input time string
    const [datePart, timePart] = utcTimeString.split(' ');
    const [day, month, year] = datePart.split('/').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);

    // Create Date object (month is 0-indexed in JavaScript)
    const inputDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));

    // Day name mapping
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    // Check if it's a 24/7 operation
    if (slaConfig.workingHours.is24x7) {
        const currentDayName = dayNames[inputDate.getUTCDay()];
        if (slaConfig.workingDays.includes(currentDayName)) {
            // Check if it's an excluded date
            if (!isExcludedDate(inputDate, slaConfig.excludedDates)) {
                return true;
            }
        }
    }

    // Check if current time is within working hours
    if (isWithinWorkingTime(inputDate, slaConfig)) {
        return true;
    }

    // Find the next working time
    return findNextWorkingTime(inputDate, slaConfig);
}

/**
 * Checks if a date is within working time
 * @param {Date} date - UTC Date object
 * @param {Object} slaConfig - SLA configuration
 * @returns {boolean}
 */
function isWithinWorkingTime(date, slaConfig) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayName = dayNames[date.getUTCDay()];

    // Check if it's a working day
    if (!slaConfig.workingDays.includes(currentDayName)) {
        return false;
    }

    // Check if it's an excluded date
    if (isExcludedDate(date, slaConfig.excludedDates)) {
        return handleExcludedDate(date, slaConfig.excludedDates);
    }

    // For 24/7 operations
    if (slaConfig.workingHours.is24x7) {
        return true;
    }

    // Check time range
    const currentTime = date.getUTCHours() * 60 + date.getUTCMinutes();
    const startTime = parseTime(slaConfig.workingHours.startTime);
    const endTime = parseTime(slaConfig.workingHours.endTime);

    return currentTime >= startTime && currentTime < endTime;
}

/**
 * Checks if a date is in the excluded dates list
 * @param {Date} date - UTC Date object
 * @param {Array} excludedDates - Array of excluded date objects
 * @returns {boolean}
 */
function isExcludedDate(date, excludedDates = []) {
    const dateString = formatDateOnly(date);
    return excludedDates.some(excluded => excluded.date === dateString);
}

/**
 * Handles excluded dates with alternative hours
 * @param {Date} date - UTC Date object
 * @param {Array} excludedDates - Array of excluded date objects
 * @returns {boolean}
 */
function handleExcludedDate(date, excludedDates = []) {
    const dateString = formatDateOnly(date);
    const excludedDate = excludedDates.find(excluded => excluded.date === dateString);

    if (!excludedDate || !excludedDate.alternativeHours) {
        return false;
    }

    const currentTime = date.getUTCHours() * 60 + date.getUTCMinutes();
    const startTime = parseTime(excludedDate.alternativeHours.startTime);
    const endTime = parseTime(excludedDate.alternativeHours.endTime);

    return currentTime >= startTime && currentTime < endTime;
}

/**
 * Finds the next working time
 * @param {Date} date - Current UTC Date object
 * @param {Object} slaConfig - SLA configuration
 * @returns {string} - Next working time in "DD/MM/YYYY HH:MM" format
 */
function findNextWorkingTime(date, slaConfig) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    let searchDate = new Date(date);

    // Look ahead up to 14 days to find next working time
    for (let i = 0; i < 14; i++) {
        const dayName = dayNames[searchDate.getUTCDay()];

        if (slaConfig.workingDays.includes(dayName)) {
            // Check if it's an excluded date
            const excludedDate = getExcludedDate(searchDate, slaConfig.excludedDates);

            if (excludedDate) {
                if (excludedDate.alternativeHours) {
                    // Use alternative hours
                    const nextTime = getNextWorkingTimeForDay(searchDate, {
                        ...slaConfig,
                        workingHours: {
                            is24x7: false,
                            startTime: excludedDate.alternativeHours.startTime,
                            endTime: excludedDate.alternativeHours.endTime
                        }
                    }, i === 0);

                    if (nextTime) {
                        return nextTime;
                    }
                }
            } else {
                // Normal working day
                const nextTime = getNextWorkingTimeForDay(searchDate, slaConfig, i === 0);
                if (nextTime) {
                    return nextTime;
                }
            }
        }

        // Move to next day
        searchDate.setUTCDate(searchDate.getUTCDate() + 1);
        searchDate.setUTCHours(0, 0, 0, 0);
    }

    // Fallback - should not reach here under normal circumstances
    return formatDateTime(searchDate);
}

/**
 * Gets the next working time for a specific day
 * @param {Date} date - UTC Date object
 * @param {Object} slaConfig - SLA configuration
 * @param {boolean} isToday - Whether this is the current day
 * @returns {string|null} - Working time or null if not available today
 */
function getNextWorkingTimeForDay(date, slaConfig, isToday) {
    if (slaConfig.workingHours.is24x7) {
        if (isToday) {
            return formatDateTime(date);
        } else {
            // Start of day
            const startOfDay = new Date(date);
            startOfDay.setUTCHours(0, 0, 0, 0);
            return formatDateTime(startOfDay);
        }
    }

    const startTime = parseTime(slaConfig.workingHours.startTime);
    const endTime = parseTime(slaConfig.workingHours.endTime);
    const currentTime = date.getUTCHours() * 60 + date.getUTCMinutes();

    if (isToday) {
        if (currentTime < startTime) {
            // Before working hours today
            const workingStartTime = new Date(date);
            workingStartTime.setUTCHours(Math.floor(startTime / 60), startTime % 60, 0, 0);
            return formatDateTime(workingStartTime);
        } else if (currentTime < endTime) {
            // Currently within working hours (shouldn't reach here if called correctly)
            return formatDateTime(date);
        } else {
            // After working hours today, need to find next working day
            return null;
        }
    } else {
        // Future day - start at beginning of working hours
        const workingStartTime = new Date(date);
        workingStartTime.setUTCHours(Math.floor(startTime / 60), startTime % 60, 0, 0);
        return formatDateTime(workingStartTime);
    }
}

/**
 * Gets excluded date object for a specific date
 * @param {Date} date - UTC Date object
 * @param {Array} excludedDates - Array of excluded date objects
 * @returns {Object|null} - Excluded date object or null
 */
function getExcludedDate(date, excludedDates = []) {
    const dateString = formatDateOnly(date);
    return excludedDates.find(excluded => excluded.date === dateString) || null;
}

/**
 * Parses time string (HH:MM) to minutes since midnight
 * @param {string} timeString - Time in "HH:MM" format
 * @returns {number} - Minutes since midnight
 */
function parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Formats a Date object to "DD/MM/YYYY HH:MM" string
 * @param {Date} date - UTC Date object
 * @returns {string} - Formatted date string
 */
function formatDateTime(date) {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Formats a Date object to "YYYY-MM-DD" string for comparison
 * @param {Date} date - UTC Date object
 * @returns {string} - Formatted date string
 */
function formatDateOnly(date) {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();

    return `${year}-${month}-${day}`;
}

// Example usage:
/*
// Import your SLA config
const slaConfig = {
    // ... your SLA configuration object
};

// Check if current time is within working hours
const currentTime = "13/06/2025 14:30";
const result = checkSLAWorkingTime(currentTime, slaConfig);

if (result === true) {
    console.log("Current time is within working hours");
} else {
    console.log(`Next working time starts at: ${result}`);
}
*/

export { checkSLAWorkingTime };