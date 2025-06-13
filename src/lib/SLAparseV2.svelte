<script>
    import { checkSLAWorkingTime } from './sla-time-checker.js';
    import Timer from "./Timer.svelte";

    // Example SLA configurations
    const company1SLA = {
        "slaId": "SLA-COMP1-001",
        "companyName": "Company 1",
        "timezone": "UTC",
        "workingDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
        "workingHours": {
            "is24x7": false,
            "startTime": "06:00",
            "endTime": "20:00"
        },
        "excludedDates": [
            {
                "date": "2025-12-25",
                "reason": "Christmas Day"
            }
        ],
        "slaMetrics": {
            "severityLevels": {
                "low": {
                    "responseTime": {
                        "unit": "hours",
                        "value": 2
                    },
                    "resolutionTime": {
                        "unit": "hours",
                        "value": 12
                    }
                },
                "medium": {
                    "responseTime": {
                        "unit": "minutes",
                        "value": 30
                    },
                    "resolutionTime": {
                        "unit": "hours",
                        "value": 6
                    }
                },
                "high": {
                    "responseTime": {
                        "unit": "minutes",
                        "value": 15
                    },
                    "resolutionTime": {
                        "unit": "hours",
                        "value": 1
                    }
                }
            }
        }
    };

    const company3SLA = {
        "slaId": "SLA-COMP3-001",
        "companyName": "Company 3",
        "timezone": "UTC",
        "workingDays": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        "workingHours": {
            "is24x7": true
        },
        "excludedDates": [
            {
                "date": "2025-11-17",
                "reason": "bdbd"
            }
        ],
        "slaMetrics": {
            "severityLevels": {
                "low": {
                    "responseTime": {
                        "unit": "minutes",
                        "value": 60
                    },
                    "resolutionTime": {
                        "unit": "hours",
                        "value": 12
                    }
                },
                "medium": {
                    "responseTime": {
                        "unit": "minutes",
                        "value": 30
                    },
                    "resolutionTime": {
                        "unit": "hours",
                        "value": 6
                    }
                },
                "high": {
                    "responseTime": {
                        "unit": "minutes",
                        "value": 5
                    },
                    "resolutionTime": {
                        "unit": "hours",
                        "value": 1
                    }
                }
            }
        }
    };

    // Reactive variables
    let inputTime = '';
    let selectedSLA = company1SLA;
    let selectedSeverity = 'high';
    let result = null;
    let calculatedEndTime = '';

    // Function to get current UTC time in DD/MM/YYYY HH:MM format
    function getCurrentUTCTime() {
        const now = new Date();
        const day = String(now.getUTCDate()).padStart(2, '0');
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const year = now.getUTCFullYear();
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');

        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    // Function to calculate end time based on severity and resolution time
    function calculateEndTime(startTime, severity, slaConfig) {
        try {
            // Parse start time
            const [datePart, timePart] = startTime.split(' ');
            const [day, month, year] = datePart.split('/').map(Number);
            const [hours, minutes] = timePart.split(':').map(Number);

            const startDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));

            // Get resolution time for the severity
            const severityConfig = slaConfig.slaMetrics?.severityLevels?.[severity];
            if (!severityConfig?.resolutionTime) {
                throw new Error('Invalid severity or missing resolution time configuration');
            }

            const resolutionTime = severityConfig.resolutionTime;
            let minutesToAdd = 0;

            // Convert resolution time to minutes
            switch (resolutionTime.unit) {
                case 'minutes':
                    minutesToAdd = resolutionTime.value;
                    break;
                case 'hours':
                    minutesToAdd = resolutionTime.value * 60;
                    break;
                case 'business_hours':
                    // For business hours, we need to calculate working time
                    return calculateBusinessHoursEndTime(startDate, resolutionTime.value, slaConfig);
                case 'business_days':
                    // For business days, we need to calculate working days
                    return calculateBusinessDaysEndTime(startDate, resolutionTime.value, slaConfig);
                default:
                    throw new Error('Unknown time unit: ' + resolutionTime.unit);
            }

            // Add minutes to start time
            const endDate = new Date(startDate.getTime() + (minutesToAdd * 60 * 1000));

            // Format end time
            const endDay = String(endDate.getUTCDate()).padStart(2, '0');
            const endMonth = String(endDate.getUTCMonth() + 1).padStart(2, '0');
            const endYear = endDate.getUTCFullYear();
            const endHours = String(endDate.getUTCHours()).padStart(2, '0');
            const endMinutes = String(endDate.getUTCMinutes()).padStart(2, '0');

            return `${endDay}/${endMonth}/${endYear} ${endHours}:${endMinutes}`;

        } catch (error) {
            console.error('Error calculating end time:', error);
            return 'Error calculating end time';
        }
    }

    // Function to calculate end time based on business hours
    function calculateBusinessHoursEndTime(startDate, hoursToAdd, slaConfig) {
        let currentDate = new Date(startDate);
        let remainingMinutes = hoursToAdd * 60;
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        while (remainingMinutes > 0) {
            const dayName = dayNames[currentDate.getUTCDay()];

            // Check if it's a working day
            if (!slaConfig.workingDays.includes(dayName)) {
                // Move to next day
                currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                currentDate.setUTCHours(0, 0, 0, 0);
                continue;
            }

            // Check if it's an excluded date
            const dateString = formatDateOnly(currentDate);
            const excludedDate = slaConfig.excludedDates?.find(ed => ed.date === dateString);
            if (excludedDate && !excludedDate.alternativeHours) {
                // Skip this day
                currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                currentDate.setUTCHours(0, 0, 0, 0);
                continue;
            }

            // Get working hours for this day
            let workingStart, workingEnd;
            if (slaConfig.workingHours.is24x7) {
                workingStart = 0; // 00:00
                workingEnd = 24 * 60; // 24:00
            } else if (excludedDate?.alternativeHours) {
                workingStart = parseTime(excludedDate.alternativeHours.startTime);
                workingEnd = parseTime(excludedDate.alternativeHours.endTime);
            } else {
                workingStart = parseTime(slaConfig.workingHours.startTime);
                workingEnd = parseTime(slaConfig.workingHours.endTime);
            }

            const currentMinutes = currentDate.getUTCHours() * 60 + currentDate.getUTCMinutes();

            // If before working hours, move to start of working hours
            if (currentMinutes < workingStart) {
                currentDate.setUTCHours(Math.floor(workingStart / 60), workingStart % 60, 0, 0);
            }

            // Calculate available working minutes today
            const availableMinutes = Math.max(0, workingEnd - Math.max(currentMinutes, workingStart));

            if (remainingMinutes <= availableMinutes) {
                // We can finish today
                currentDate.setUTCMinutes(currentDate.getUTCMinutes() + remainingMinutes);
                break;
            } else {
                // Use all available time today and continue tomorrow
                remainingMinutes -= availableMinutes;
                currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                currentDate.setUTCHours(0, 0, 0, 0);
            }
        }

        return formatDateTime(currentDate);
    }

    // Function to calculate end time based on business days
    function calculateBusinessDaysEndTime(startDate, daysToAdd, slaConfig) {
        let currentDate = new Date(startDate);
        let remainingDays = daysToAdd;
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        while (remainingDays > 0) {
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            const dayName = dayNames[currentDate.getUTCDay()];

            // Check if it's a working day and not excluded
            const dateString = formatDateOnly(currentDate);
            const isExcluded = slaConfig.excludedDates?.some(ed => ed.date === dateString && !ed.alternativeHours);

            if (slaConfig.workingDays.includes(dayName) && !isExcluded) {
                remainingDays--;
            }
        }

        // Set to start of working hours on the final day
        if (slaConfig.workingHours.is24x7) {
            // Keep the original time
        } else {
            const startTime = parseTime(slaConfig.workingHours.startTime);
            currentDate.setUTCHours(Math.floor(startTime / 60), startTime % 60, 0, 0);
        }

        return formatDateTime(currentDate);
    }

    // Helper functions
    function parseTime(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    function formatDateTime(date) {
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');

        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    function formatDateOnly(date) {
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();

        return `${year}-${month}-${day}`;
    }

    // Set current time on component mount
    inputTime = getCurrentUTCTime();

    // Reactive statement to check SLA when inputs change
    $: if (inputTime && selectedSLA) {
        try {
            result = checkSLAWorkingTime(inputTime, selectedSLA);
            calculatedEndTime = calculateEndTime(inputTime, selectedSeverity, selectedSLA);
        } catch (error) {
            result = `Error: ${error.message}`;
            calculatedEndTime = 'Error calculating end time';
        }
    }
</script>

<main>
    <h1>SLA Working Time Checker</h1>

    <div class="controls">
        <div class="input-group">
            <label for="time-input">UTC Time (DD/MM/YYYY HH:MM):</label>
            <input
                id="time-input"
                type="text"
                bind:value={inputTime}
                placeholder="13/06/2025 14:30"
            />
        </div>

        <div class="input-group">
            <label for="severity-select">Severity Level:</label>
            <select id="severity-select" bind:value={selectedSeverity}>
                <option value="low">Low - {selectedSLA.slaMetrics?.severityLevels?.low?.resolutionTime?.value} {selectedSLA.slaMetrics?.severityLevels?.low?.resolutionTime?.unit}</option>
                <option value="medium">Medium - {selectedSLA.slaMetrics?.severityLevels?.medium?.resolutionTime?.value} {selectedSLA.slaMetrics?.severityLevels?.medium?.resolutionTime?.unit}</option>
                <option value="high">High - {selectedSLA.slaMetrics?.severityLevels?.high?.resolutionTime?.value} {selectedSLA.slaMetrics?.severityLevels?.high?.resolutionTime?.unit}</option>
            </select>
        </div>

        <div class="input-group">
            <label for="sla-select">SLA Configuration:</label>
            <select id="sla-select" bind:value={selectedSLA}>
                <option value={company1SLA}>Company 1 (Mon-Fri, 6:00-20:00)</option>
                <option value={company3SLA}>Company 3 (24/7)</option>
            </select>
        </div>
    </div>

    <div class="result">
        <h2>Result:</h2>
        {#if result === true}
            <div class="status working">
                ✅ Time is within working hours
                <div class="timer-info">
                    <p><strong>Start Time:</strong> {inputTime}</p>
                    <p><strong>Calculated End Time ({selectedSeverity} severity):</strong> {calculatedEndTime}</p>
                </div>
                <Timer startTime={inputTime} endTime={calculatedEndTime}/>
            </div>
        {:else if typeof result === 'string' && !result.startsWith('Error')}
            <div class="status not-working">
                ❌ Outside working hours<br>
                <strong>Next working time: {result}</strong>
                <div class="timer-info">
                    <p><strong>SLA will start at:</strong> {result}</p>
                    <p><strong>Calculated End Time ({selectedSeverity} severity):</strong> {calculateEndTime(result, selectedSeverity, selectedSLA)}</p>
                    <Timer startTime={result} endTime={calculatedEndTime}/>
                </div>
            </div>
        {:else if result}
            <div class="status error">
                {result}
            </div>
        {/if}
    </div>

    <div class="sla-info">
        <h3>Current SLA Configuration:</h3>
        <div class="severity-info">
            <h4>Severity Levels:</h4>
            <ul>
                <li><strong>High:</strong> Response: {selectedSLA.slaMetrics?.severityLevels?.high?.responseTime?.value} {selectedSLA.slaMetrics?.severityLevels?.high?.responseTime?.unit}, Resolution: {selectedSLA.slaMetrics?.severityLevels?.high?.resolutionTime?.value} {selectedSLA.slaMetrics?.severityLevels?.high?.resolutionTime?.unit}</li>
                <li><strong>Medium:</strong> Response: {selectedSLA.slaMetrics?.severityLevels?.medium?.responseTime?.value} {selectedSLA.slaMetrics?.severityLevels?.medium?.responseTime?.unit}, Resolution: {selectedSLA.slaMetrics?.severityLevels?.medium?.resolutionTime?.value} {selectedSLA.slaMetrics?.severityLevels?.medium?.resolutionTime?.unit}</li>
                <li><strong>Low:</strong> Response: {selectedSLA.slaMetrics?.severityLevels?.low?.responseTime?.value} {selectedSLA.slaMetrics?.severityLevels?.low?.resolutionTime?.unit}, Resolution: {selectedSLA.slaMetrics?.severityLevels?.low?.resolutionTime?.value} {selectedSLA.slaMetrics?.severityLevels?.low?.resolutionTime?.unit}</li>
            </ul>
        </div>
    </div>

     <div class="sla-info">
        <h3>Current SLA Configuration:</h3>
        <pre>{JSON.stringify(selectedSLA, null, 2)}</pre>
    </div>

</main>

<style>
    main {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        font-family: Arial, sans-serif;
    }

    .controls {
        background: #f5f5f5;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 20px;
    }

    .input-group {
        margin-bottom: 15px;
    }

    label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
    }

    input, select {
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        margin-right: 10px;
        min-width: 200px;
    }

    button {
        padding: 8px 12px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin-right: 5px;
        margin-bottom: 5px;
    }

    button:hover {
        background: #0056b3;
    }

    .result {
        background: white;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
    }

    .status {
        padding: 15px;
        border-radius: 6px;
        font-size: 16px;
    }

    .working {
        background: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
    }

    .not-working {
        background: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
    }

    .error {
        background: #fff3cd;
        color: #856404;
        border: 1px solid #ffeaa7;
    }

    .timer-info {
        margin: 10px 0;
        padding: 10px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 4px;
    }

    .timer-info p {
        margin: 5px 0;
        font-size: 14px;
    }

    .sla-info {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
    }

    .severity-info {
        margin-top: 15px;
    }

    .severity-info ul {
        list-style-type: none;
        padding: 0;
    }

    .severity-info li {
        background: white;
        padding: 8px;
        margin: 5px 0;
        border-radius: 4px;
        border-left: 4px solid #007bff;
    }

    pre {
        background: white;
        padding: 10px;
        border-radius: 4px;
        overflow-x: auto;
        font-size: 12px;
    }
</style>