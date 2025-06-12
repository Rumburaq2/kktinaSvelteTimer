<script>
	import Timer from "./lib/Timer.svelte";

    let isVisible = true;

</script>

<div class="grid-gap">
		<div style:display={isVisible ? 'block' : 'none'}>
			<Timer startTime="12/6/2025 15:00" endTime="13/6/2025 00:10"/>
		</div>

	<div class="container">
		<div class="SLAcontainer mounted"></div>
	</div>

</div>