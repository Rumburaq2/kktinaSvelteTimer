<script>
    import { checkSLAWorkingTime } from './sla-time-checker.js';

    // Example SLA configurations
    const company1SLA = {
        "slaId": "SLA-COMP1-001",
        "companyName": "Company 1",
        "timezone": "UTC",
        "workingDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
        "workingHours": {
            "is24x7": false,
            "startTime": "08:00",
            "endTime": "20:00"
        },
        "excludedDates": [
            {
                "date": "2025-12-25",
                "reason": "Christmas Day"
            }
        ]
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
        ]
    };

    // Reactive variables
    let inputTime = '';
    let selectedSLA = company1SLA;
    let result = null;

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

    // Set current time on component mount
    inputTime = getCurrentUTCTime();

    // Reactive statement to check SLA when inputs change
    $: if (inputTime && selectedSLA) {
        try {
            result = checkSLAWorkingTime(inputTime, selectedSLA);
        } catch (error) {
            result = `Error: ${error.message}`;
        }
    }

    function useCurrentTime() {
        inputTime = getCurrentUTCTime();
    }

    // Test scenarios
    function testScenario(scenario) {
        switch(scenario) {
            case 'weekday-morning':
                inputTime = '17/06/2025 09:00'; // Tuesday morning
                break;
            case 'weekend':
                inputTime = '14/06/2025 10:00'; // Saturday
                break;
            case 'after-hours':
                inputTime = '16/06/2025 22:00'; // Monday evening
                break;
            case 'holiday':
                inputTime = '25/12/2025 10:00'; // Christmas Day
                break;
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
            <button on:click={useCurrentTime}>Use Current Time</button>
        </div>

        <div class="input-group">
            <label for="sla-select">Select SLA Configuration:</label>
            <select id="sla-select" bind:value={selectedSLA}>
                <option value={company1SLA}>Company 1 (Mon-Fri, 8:00-20:00)</option>
                <option value={company3SLA}>Company 3 (24/7)</option>
            </select>
        </div>

        <div class="test-scenarios">
            <h3>Test Scenarios:</h3>
            <button on:click={() => testScenario('weekday-morning')}>Weekday Morning</button>
            <button on:click={() => testScenario('weekend')}>Weekend</button>
            <button on:click={() => testScenario('after-hours')}>After Hours</button>
            <button on:click={() => testScenario('holiday')}>Holiday</button>
        </div>
    </div>

    <div class="result">
        <h2>Result:</h2>
        {#if result === true}
            <div class="status working">
                ✅ Time is within working hours
            </div>
        {:else if typeof result === 'string' && !result.startsWith('Error')}
            <div class="status not-working">
                ❌ Outside working hours<br>
                <strong>Next working time: {result}</strong>
            </div>
        {:else if result}
            <div class="status error">
                {result}
            </div>
        {/if}
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

    .test-scenarios button {
        background: #28a745;
        font-size: 12px;
        padding: 6px 10px;
    }

    .test-scenarios button:hover {
        background: #1e7e34;
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

    .sla-info {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
    }

    pre {
        background: white;
        padding: 10px;
        border-radius: 4px;
        overflow-x: auto;
        font-size: 12px;
    }
</style>