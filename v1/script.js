/*
  We have 5 frequencies: f0, f1, f2, f3, f4.

  f0 -> "Base" freq (unlocked by default, multiple=0).
  f1 -> "Second" freq (unlocked by default, multiple=0).
  f2..f4 -> DR freqs (locked by default, multiples 2..4).

  Each frequency object has:
    - name:         (e.g., "f0", "f1", ...)
    - freq:         numeric frequency
    - enabled:      boolean (off by default)
    - volume:       slider/gain factor (0..1)
    - locked:       for DR freqs (true/false)
    - multiple:     how many "deltas" above f0
    - enableCheckbox: reference to the "On" checkbox
    - volumeSlider:    reference to the volume slider
    - slider:         reference to the freq slider
    - inputEl:        reference to the freq number input
    - lockCheckbox:   reference to the "Lock" checkbox
    - osc:            an OscillatorNode
    - gainNode:       a GainNode
*/

const frequencies = [
    // f0 (base), f1 (second), both initially OFF
    { name: "f0", freq: 220, enabled: false, volume: 0.5, locked: false, multiple: 0 },
    { name: "f1", freq: 330, enabled: false, volume: 0.5, locked: false, multiple: 0 },
  
    // DR frequencies (locked by default, off by default)
    { name: "f2", freq: 0,   enabled: false, volume: 0.5, locked: true,  multiple: 2 },
    { name: "f3", freq: 0,   enabled: false, volume: 0.5, locked: true,  multiple: 3 },
    { name: "f4", freq: 0,   enabled: false, volume: 0.5, locked: true,  multiple: 4 }
  ];
  
  let audioCtx         = null; // will be created on-demand
  const deltaDisplay   = document.getElementById('deltaDisplay');
  const waveformSelect = document.getElementById('waveform');
  const freqContainer  = document.getElementById('frequenciesContainer');
  
  // --------------------------------------------------------------
  // Build the UI in JS, attach event listeners
  // --------------------------------------------------------------
  frequencies.forEach((f, index) => {
    // Create a container row for this frequency
    const row = document.createElement('div');
    row.className = 'freq-row';
  
    // Label (f0, f1, f2, etc.)
    const label = document.createElement('label');
    label.textContent = f.name + ":";
    row.appendChild(label);
  
    // On/Off checkbox
    const enableCheckbox = document.createElement('input');
    enableCheckbox.type = 'checkbox';
    enableCheckbox.checked = f.enabled;
    enableCheckbox.style.marginLeft = "8px";
    enableCheckbox.addEventListener('change', () => {
      f.enabled = enableCheckbox.checked;
      handleEnableChange(f);
    });
    row.appendChild(enableCheckbox);
  
    const onOffLabel = document.createElement('span');
    onOffLabel.className = 'onOffLabel';
    onOffLabel.textContent = "On";
    row.appendChild(onOffLabel);
  
    // Volume slider
    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = '0';
    volumeSlider.max = '1';
    volumeSlider.step = '0.01';
    volumeSlider.value = f.volume.toString();
    volumeSlider.className = 'volumeSlider';
    volumeSlider.addEventListener('input', () => {
      f.volume = parseFloat(volumeSlider.value);
      if (f.gainNode) {
        f.gainNode.gain.value = f.volume;
      }
    });
    row.appendChild(volumeSlider);
  
    // Frequency slider
    const freqSlider = document.createElement('input');
    freqSlider.type = 'range';
    freqSlider.min = '20';
    freqSlider.max = '2000';
    freqSlider.value = f.freq.toString();
    freqSlider.step = '0.1';
    freqSlider.className = 'freqSlider';
    freqSlider.addEventListener('input', () => {
      if (f.locked && index >= 2) return; // ignore if locked DR
      f.freq = parseFloat(freqSlider.value);
      freqInput.value = f.freq.toFixed(2);
      recalcFrequencies();
      updateOscillatorParams();
    });
    row.appendChild(freqSlider);
  
    // Frequency numeric input
    const freqInput = document.createElement('input');
    freqInput.type = 'number';
    freqInput.min = '20';
    freqInput.max = '2000';
    freqInput.step = '0.1';
    freqInput.value = f.freq.toString();
    freqInput.className = 'freqNumber';
    freqInput.addEventListener('input', () => {
      if (f.locked && index >= 2) return; // ignore if locked DR
      const val = parseFloat(freqInput.value);
      if (!isNaN(val)) {
        f.freq = val;
        freqSlider.value = f.freq.toString();
        recalcFrequencies();
        updateOscillatorParams();
      }
    });
    row.appendChild(freqInput);
  
    // Lock checkbox (for f2, f3, f4)
    let lockCheckbox = null;
    if (index >= 2) {
      lockCheckbox = document.createElement('input');
      lockCheckbox.type = 'checkbox';
      lockCheckbox.checked = f.locked;
      lockCheckbox.className = 'lockCheckbox';
      lockCheckbox.addEventListener('change', () => {
        f.locked = lockCheckbox.checked;
        recalcFrequencies();
        updateOscillatorParams();
      });
      row.appendChild(lockCheckbox);
  
      const lockLabel = document.createElement('span');
      lockLabel.textContent = "Lock";
      row.appendChild(lockLabel);
    }
  
    // Append the row to our container
    freqContainer.appendChild(row);
  
    // Store references
    f.enableCheckbox = enableCheckbox;
    f.volumeSlider   = volumeSlider;
    f.slider         = freqSlider;
    f.inputEl        = freqInput;
    f.lockCheckbox   = lockCheckbox;
  });
  
  // --------------------------------------------------------------
  // Recalculate locked DR frequencies (f2..f4) based on f0, f1
  // --------------------------------------------------------------
  function recalcFrequencies() {
    const baseFreq   = frequencies[0].freq; // f0
    const secondFreq = frequencies[1].freq; // f1
    const delta      = secondFreq - baseFreq;
  
    // Update delta display
    deltaDisplay.textContent = delta.toFixed(2);
  
    // For locked DR freq: freq = f0 + multiple * delta
    for (let i = 2; i < frequencies.length; i++) {
      const f = frequencies[i];
      if (f.locked) {
        f.freq = baseFreq + f.multiple * delta;
        f.slider.value  = f.freq.toFixed(2);
        f.inputEl.value = f.freq.toFixed(2);
        f.slider.disabled  = true;
        f.inputEl.disabled = true;
      } else {
        f.slider.disabled  = false;
        f.inputEl.disabled = false;
      }
    }
  }
  
  // --------------------------------------------------------------
  // Audio Handling
  // --------------------------------------------------------------
  
  // Called when "On" checkbox changes
  function handleEnableChange(f) {
    // If user just turned this frequency on and there's no audioCtx yet, create it
    if (f.enabled && !audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  
    if (f.enabled) {
      // Turn on => create oscillator if not existing
      if (!f.osc && audioCtx) {
        createOscillator(f);
      }
    } else {
      // Turn off => stop & remove existing osc/gain
      if (f.osc) {
        f.osc.stop();
        f.osc.disconnect();
        f.osc = null;
      }
      if (f.gainNode) {
        f.gainNode.disconnect();
        f.gainNode = null;
      }
    }
  }
  
  // Create an oscillator (and gain node) for a frequency object
  function createOscillator(f) {
    if (!audioCtx) return;
    if (f.osc) return; // already has one
  
    // Oscillator
    f.osc = audioCtx.createOscillator();
    f.osc.type = waveformSelect.value;
    f.osc.frequency.value = f.freq;
  
    // Gain node
    f.gainNode = audioCtx.createGain();
    f.gainNode.gain.value = f.volume;
  
    // Connect oscillator -> gain -> destination
    f.osc.connect(f.gainNode);
    f.gainNode.connect(audioCtx.destination);
  
    // Start
    f.osc.start();
  }
  
  // Update oscillator params in real-time
  function updateOscillatorParams() {
    if (!audioCtx) return;
    const waveType = waveformSelect.value;
  
    frequencies.forEach(f => {
      if (f.osc) {
        // Update waveform, frequency, volume
        f.osc.type = waveType;
        f.osc.frequency.value = f.freq;
        if (f.gainNode) {
          f.gainNode.gain.value = f.volume;
        }
      } else {
        // If it's on but no oscillator yet, create it
        if (f.enabled && !f.osc) {
          createOscillator(f);
        }
      }
    });
  }
  
  // --------------------------------------------------------------
  // Initial setup
  // --------------------------------------------------------------
  recalcFrequencies();
  // No audio context until user first checks "On"
  