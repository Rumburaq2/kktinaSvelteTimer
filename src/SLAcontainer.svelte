<script>
	import Timer from "./lib/Timer.svelte";
	import SLA from "./lib/SLAparse.svelte";

    let isVisible = true;

</script>

<div class="grid-gap">
		<div style:display={isVisible ? 'block' : 'none'}>
			<!-- <Timer startTime="12/6/2025 14:00" endTime="12/6/2025 14:30"/> -->
			<SLA />
		</div>

	<div class="container">
		<div class="SLAcontainer mounted"></div>
	</div>

</div>