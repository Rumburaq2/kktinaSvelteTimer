<script>
  import { onMount, onDestroy } from 'svelte';

  // Input timestamps in DD/MM/YYYY HH:MM format
  export let startTime = "25/12/2025 15:30";
  export let endTime = "31/12/2025 23:59";

  let currentTime = new Date();
  let timeRemaining = 0;
  let totalDuration = 0;
  let progress = 0;
  let isExpired = false;
  let hasStarted = false;
  let interval;

  let alertCustomerID = 1;


  let result;
  //result = getClosestWorkingTime(startTime);


  // Parse DD/MM/YYYY HH:MM format as UTC
  function parseTimestamp(timestamp) {
      const [datePart, timePart] = timestamp.split(' ');
      const [day, month, year] = datePart.split('/');
      const [hours, minutes] = timePart.split(':');

      // Create UTC date
      return new Date(Date.UTC(year, month - 1, day, hours, minutes));
  }

  // Format time remaining as HH:MM:SS
  function formatTime(milliseconds) {
      if (milliseconds <= 0) return "00:00:00";

      const totalSeconds = Math.floor(milliseconds / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Format current time as DD/MM/YYYY HH:MM:SS UTC
  function formatCurrentTime(date) {
      const day = date.getUTCDate().toString().padStart(2, '0');
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const year = date.getUTCFullYear();
      const hours = date.getUTCHours().toString().padStart(2, '0');
      const minutes = date.getUTCMinutes().toString().padStart(2, '0');
      const seconds = date.getUTCSeconds().toString().padStart(2, '0');

      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} UTC`;
  }

  function updateTimer() {
      currentTime = new Date();
      //currentTime = new Date(Date.UTC(2025, 6 - 1, 13, 18, 50));
      const start = parseTimestamp(startTime);
      const end = parseTimestamp(endTime);

      // Check if we're before start time
      if (currentTime.getTime() < start.getTime()) {
          timeRemaining = start.getTime() - currentTime.getTime();
          hasStarted = false;
          isExpired = false;
          progress = 0;
      }
      // Check if we're between start and end time
      else if (currentTime.getTime() <= end.getTime()) {
          timeRemaining = end.getTime() - currentTime.getTime();
          hasStarted = true;
          isExpired = false;

          // Calculate progress from start time to end time
          const elapsed = currentTime.getTime() - start.getTime();
          progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
      }
      // We're past end time
      else {
          timeRemaining = 0;
          hasStarted = true;
          isExpired = true;
          progress = 100;

          if (interval) {
              clearInterval(interval);
          }
      }
  }

  function startTimer() {
      const start = parseTimestamp(startTime);
      const end = parseTimestamp(endTime);

      // Set total duration from start to end time
      totalDuration = end.getTime() - start.getTime();

      if (totalDuration <= 0) {
          console.warn("End time must be after start time");
          totalDuration = 1; // Prevent division by zero
      }

      updateTimer();
      interval = setInterval(updateTimer, 1000);
  }

  onMount(() => {
      startTimer();
  });

  onDestroy(() => {
      if (interval) {
          clearInterval(interval);
      }
  });
</script>

<div class="timer-container">
    <h2>Timer</h2>

    <div class="target-time">
        Target: {startTime}<br>
        End: {endTime}
    </div>

    <div class="time-display" class:expired={isExpired}>
        {formatTime(timeRemaining)}
    </div>

    <div class="progress-container">
        <div class="progress-bar">
            <div
                    class="progress-fill"
                    style="width: {progress}%"
                    class:expired={isExpired}
            ></div>
        </div>
        <div class="progress-text">{Math.round(progress)}%</div>
    </div>

    {#if isExpired}
        <div class="expired-message">
            Event finished! ✅
        </div>
    {:else if !hasStarted}
        <div class="not-started-message">
            Event hasn't started yet ⏳
        </div>
    {:else}
        <div class="active-message">
            Event in progress! 🔥
        </div>
    {/if}
</div>

<style>
    .timer-container {
        max-width: 400px;
        margin: 2rem auto;
        padding: 2rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        color: white;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    h2 {
        margin: 0 0 1rem 0;
        font-size: 1.5rem;
        font-weight: 300;
    }

    .current-time {
        font-size: 1rem;
        font-weight: bold;
        margin-bottom: 1rem;
        padding: 0.5rem;
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        font-family: 'Courier New', monospace;
    }

    .target-time {
        font-size: 0.9rem;
        opacity: 0.8;
        margin-bottom: 1.5rem;
    }

    .time-display {
        font-size: 3rem;
        font-weight: bold;
        font-family: 'Courier New', monospace;
        margin-bottom: 2rem;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        transition: color 0.3s ease;
    }

    .time-display.expired {
        color: #ff6b6b;
        animation: pulse 1s infinite;
    }

    .time-display.not-started {
        color: #ffd93d;
    }

    .progress-container {
        margin-bottom: 1rem;
    }

    .progress-bar {
        width: 100%;
        height: 12px;
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        overflow: hidden;
        margin-bottom: 0.5rem;
    }

    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
        border-radius: 6px;
        transition: width 0.3s ease;
    }

    .progress-fill.expired {
        background: linear-gradient(90deg, #ff6b6b 0%, #ffa726 100%);
        animation: glow 1s infinite alternate;
    }

    .progress-text {
        font-size: 0.8rem;
        opacity: 0.9;
    }

    .not-started-message {
        font-size: 1.2rem;
        font-weight: bold;
        color: #ffd93d;
        margin-top: 1rem;
    }

    .active-message {
        font-size: 1.2rem;
        font-weight: bold;
        color: #4facfe;
        margin-top: 1rem;
        animation: pulse 2s infinite;
    }

    .expired-message {
        font-size: 1.2rem;
        font-weight: bold;
        color: #4caf50;
        margin-top: 1rem;
    }

    @keyframes pulse {
        0%, 100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }

    @keyframes glow {
        0% {
            box-shadow: 0 0 5px rgba(255, 107, 107, 0.5);
        }
        100% {
            box-shadow: 0 0 20px rgba(255, 107, 107, 0.8);
        }
    }

    @keyframes bounce {
        0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
        }
        40% {
            transform: translateY(-10px);
        }
        60% {
            transform: translateY(-5px);
        }
    }
</style>