<script>
	import SLAbar from "./lib/SLAbar.svelte";

    let isVisible = true;
</script>

<div class="grid-gap">
		<div style:display={isVisible ? 'block' : 'none'}>
			<SLAbar/>
		</div>
</div>