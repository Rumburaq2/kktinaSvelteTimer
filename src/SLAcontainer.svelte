<script>
	import SLAbar from "./lib/SLAbar.svelte";
	import { createPersistentStore } from './lib/persistentStore.js';


    let isVisible = true;

	function formatDate(input) {
  		const date = new Date(input);

  		// Get day, month, year, hours, and minutes with proper padding
  		const day = String(date.getDate()).padStart(2, '0');
  		const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  		const year = date.getFullYear();
  		const hours = String(date.getHours()).padStart(2, '0');
  		const minutes = String(date.getMinutes()).padStart(2, '0');

  		return `${day}/${month}/${year} ${hours}:${minutes}`;
	}


	console.log(formatDate("2023-03-26T03:00:30"));
	console.log((Math.floor((Date.now()) / (1000 * 60)) * 60));
	const storeName = String((Math.floor((Date.now()) / (1000 * 60)) * 60));//IRIS time


	const myStore = createPersistentStore(storeName, -1);


	function testLocalStorageSpace() {
		/*
  try {

    for (let i = 0; i < 100000; i++) {
      // Use a unique key for each iteration (e.g., include the index `i`)
      const testKey = `testKey_${i}_${Date.now()}`; // Unique key
      const data = String(Math.floor(Math.random() * (45000 - 60 + 1)) + 60);
      localStorage.setItem(testKey, data);
    }
    console.log("Successfully added 5 entries to localStorage!");
  } catch (e) {
    const used = Math.round(JSON.stringify(localStorage).length / 1024 / 1024);
    console.log(`LocalStorage is full! ~${used}MB used.`);
  }

	   */
	  localStorage.clear()
}

testLocalStorageSpace();

</script>

<div class="grid-gap">
		<div style:display={isVisible ? 'block' : 'none'}>
			<SLAbar {myStore}/>
		</div>

	<div class="container">
		<div class="SLAcontainer mounted"></div>
	</div>

</div>