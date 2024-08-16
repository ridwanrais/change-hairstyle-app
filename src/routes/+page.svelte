<script lang="ts">
	import { imageStore } from '../stores/imageStore';
	import { get } from 'svelte/store';
	import { onDestroy } from 'svelte';
	import { PUBLIC_AILAB_API_KEY } from '$env/static/public';

	let selectedFile: File | null = null;
	let storedImage: string | null = get(imageStore);
	let hairStyle: string = 'BuzzCut'; // Default value, will be updated based on gender
	let color: string = 'blue';
	let taskId: string | null = null;
	let intervalId: number | null = null;
	let resultImage: string | null = null; // To store and display the result image
	let downloadUrl: string | null = null; // To store the URL for downloading the result image
	let selectedGender: 'male' | 'female' | null = null; // To store the selected gender
	let processing: boolean = false; // To track the processing state

	const colorMap = {
		blonde: '#faf0be',
		platinumBlonde: '#eee8aa',
		brown: '#654321',
		lightBrown: '#b5651d',
		blue: '#0000ff',
		lightBlue: '#add8e6',
		purple: '#800080',
		lightPurple: '#e6e6fa',
		pink: '#ffc0cb',
		black: '#000000',
		white: '#ffffff',
		grey: '#808080',
		silver: '#c0c0c0',
		red: '#ff0000',
		orange: '#ffa500',
		green: '#008000',
		gradient: 'linear-gradient(to right, #ff7e5f, #feb47b)', // Gradient example
		multicolored: 'linear-gradient(to right, #ff7e5f, #feb47b, #86a8e7, #7f7fd5)',
		darkBlue: '#00008b',
		burgundy: '#800020',
		darkGreen: '#006400'
	};

	const maleHairstyles = [
		'BuzzCut',
		'UnderCut',
		'Pompadour',
		'SlickBack',
		'CurlyShag',
		'WavyShag',
		'FauxHawk',
		'Spiky',
		'CombOver',
		'HighTightFade',
		'ManBun',
		'Afro',
		'LowFade',
		'UndercutLongHair',
		'TwoBlockHaircut',
		'TexturedFringe',
		'BluntBowlCut',
		'LongWavyCurtainBangs',
		'MessyTousled',
		'MediumLengthWavy',
		'CornrowBraids',
		'LongHairTiedUp',
		'Middle-parted'
	];

	const femaleHairstyles = [
		'ShortPixieWithShavedSides',
		'ShortNeatBob',
		'DoubleBun',
		'Updo',
		'Spiked',
		'bowlCut',
		'Chignon',
		'PixieCut',
		'SlickedBack',
		'LongCurly',
		'CurlyBob',
		'StackedCurlsInShortBob',
		'SidePartCombOverHairstyleWithHighFade',
		'WavyFrenchBobVibesfrom1920',
		'BobCut',
		'ShortTwintails',
		'ShortCurlyPixie',
		'LongStraight',
		'LongWavy',
		'FishtailBraid',
		'TwinBraids',
		'Ponytail',
		'Dreadlocks',
		'Cornrows',
		'ShoulderLengthHair',
		'LooseCurlyAfro',
		'LongTwintails',
		'LongHimeCut',
		'BoxBraids'
	];

	// Subscribe to store changes
	imageStore.subscribe((value) => (storedImage = value));

	const handleFileUpload = (event: Event) => {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			selectedFile = input.files[0];
			const reader = new FileReader();
			reader.onload = () => {
				// Store the base64 encoded image in the Svelte store
				imageStore.set(reader.result as string);
			};
			reader.readAsDataURL(selectedFile);
		}
	};

	const submitImage = async () => {
		if (!selectedFile) {
			alert('Please upload an image first.');
			return;
		}

		const formData = new FormData();
		formData.append('task_type', 'async');
		formData.append('image', selectedFile);
		formData.append('hair_style', hairStyle);
		formData.append('color', color);

		try {
			processing = true; // Set processing to true when submitting

			const response = await fetch(
				'https://www.ailabapi.com/api/portrait/effects/hairstyle-editor-pro',
				{
					method: 'POST',
					headers: {
						'ailabapi-api-key': PUBLIC_AILAB_API_KEY // Use the environment variable
					},
					body: formData
				}
			);

			if (!response.ok) {
				throw new Error('Failed to process the image.');
			}

			const data = await response.json();

			if (data.error_code !== 0) {
				throw new Error(`API Error: ${data.error_detail.message || 'Unknown error'}`);
			}

			taskId = data.task_id;
			console.log('Task ID:', taskId);

			// Start polling the task result every 5 seconds
			intervalId = window.setInterval(checkTaskResult, 5000);
		} catch (error) {
			console.error('Error:', error);
			alert('Failed to process the image.');
		}
	};

	const checkTaskResult = async () => {
		if (!taskId) return;

		try {
			const response = await fetch(
				`https://www.ailabapi.com/api/common/query-async-task-result?task_id=${taskId}`,
				{
					method: 'GET',
					headers: {
						'ailabapi-api-key': PUBLIC_AILAB_API_KEY // Use the environment variable
					}
				}
			);

			if (!response.ok) {
				throw new Error('Failed to retrieve task result.');
			}

			const data = await response.json();

			if (data.error_code === 0) {
				if (data.data.images && data.data.images.length > 0) {
					resultImage = data.data.images[0];
					downloadUrl = resultImage; // Set the download URL

					// Stop polling once the image is available
					if (intervalId) {
						clearInterval(intervalId);
						intervalId = null;
					}

					processing = false; // Set processing to false when done
				} else {
					console.log('Task still in progress...');
				}
			} else {
				console.error('Error fetching task result:', data.error_detail.message);
			}
		} catch (error) {
			console.error('Error:', error);
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = null;
			}
			processing = false; // Ensure processing is false on error
			alert('Failed to retrieve task result.');
		}
	};

	onDestroy(() => {
		// Clear the interval if the component is destroyed
		if (intervalId) {
			clearInterval(intervalId);
		}
	});
</script>

<main>
	<h1>Upload Your Photo</h1>
	<input type="file" accept="image/*" on:change={handleFileUpload} />

	{#if !selectedGender}
		<h2>Select Gender</h2>
		<button on:click={() => (selectedGender = 'male')}>Male</button>
		<button on:click={() => (selectedGender = 'female')}>Female</button>
	{/if}

	{#if selectedGender}
		<h2>Choose Hairstyle and Color</h2>
		{#if storedImage}
			<img
				src={storedImage}
				alt="Uploaded Image"
				style="max-width: 300px; max-height: 300px; margin-top: 1rem; object-fit: contain;"
			/>

			<h3>Choose Hairstyle</h3>
			<select bind:value={hairStyle}>
				{#each selectedGender === 'male' ? maleHairstyles : femaleHairstyles as style}
					<option value={style}>{style}</option>
				{/each}
			</select>

			<h3>Choose Color</h3>
			<select bind:value={color}>
				{#each Object.keys(colorMap) as colorOption}
					<option value={colorOption}>
						{colorOption}
					</option>
				{/each}
			</select>

			<div style="margin-top: 1rem;">
				<h3>Selected Color Preview:</h3>
				<div style="display: flex; align-items: center;">
					<div
						style="
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: {colorMap[color]};
                margin-right: 1rem;
              "
					></div>
					<span>{color}</span>
				</div>
			</div>

			<button on:click={submitImage} style="margin-top: 1rem;" disabled={processing}>Submit</button>

			{#if processing}
				<div style="margin-top: 1rem;">
					<p>Processing...</p>
					<!-- Simple spinner -->
					<div
						style="border: 4px solid rgba(0, 0, 0, 0.1); border-radius: 50%; border-top: 4px solid #000; width: 40px; height: 40px; animation: spin 1s linear infinite;"
					></div>
					<style>
						@keyframes spin {
							0% {
								transform: rotate(0deg);
							}
							100% {
								transform: rotate(360deg);
							}
						}
					</style>
				</div>
			{/if}
		{/if}
	{/if}

	{#if resultImage}
		<h2>Processed Image:</h2>
		<img
			src={resultImage}
			alt="Processed Image"
			style="max-width: 300px; max-height: 300px; margin-top: 1rem; object-fit: contain;"
		/>

		{#if downloadUrl}
			<a
				href={downloadUrl}
				download="processed-image.jpg"
				style="display: block; margin-top: 1rem; padding: 0.5rem 1rem; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 4px;"
			>
				Download Image
			</a>
		{/if}
	{/if}
</main>
