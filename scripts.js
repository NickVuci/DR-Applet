document.addEventListener('DOMContentLoaded', () => {
  const oscillatorContainer = document.getElementById('oscillatorContainer');

  const randomizeErrorsBtn = document.getElementById('randomizeErrorsBtn');
  const randomizeDeltaBtn = document.getElementById('randomizeDeltaBtn');
  const randomizeRootBtn = document.getElementById('randomizeRootBtn');

  // Randomize Errors
  randomizeErrorsBtn.addEventListener('click', () => {
    for (let i = 1; i <= 5; i++) {
        if (errorSliders[i]) errorSliders[i].value = (Math.random() * 40 - 20).toFixed(1);
        if (errorInputs[i])  errorInputs[i].value  = errorSliders[i].value;
    }
    updateOscillators();
  });

  // Randomize Delta
  randomizeDeltaBtn.addEventListener('click', () => {
    const randomDelta = (Math.random() * 299 + 1).toFixed(1); // Random value between 1 and 300
    deltaSlider.value = randomDelta;
    deltaInput.value = randomDelta;
    updateOscillators();
  });

  // Randomize Root
  randomizeRootBtn.addEventListener('click', () => {
    const randomRoot = (Math.random() * 980 + 20).toFixed(1); // Random value between 20 and 1000
    rootSlider.value = randomRoot;
    rootInput.value = randomRoot;
    updateOscillators();
  });

  const createOscillatorGroup = (index) => {
    const oscGroup = document.createElement('div');
    oscGroup.className = 'osc-group';

    const controlRow = document.createElement('div');
    controlRow.className = 'control-row';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `check${index}`;
    checkbox.checked = true;

    const label = document.createElement('label');
    label.htmlFor = `check${index}`;
    label.textContent = `f${index}`;

    const span = document.createElement('span');
    span.innerHTML = ` | freq: <span id="freq${index}Hz">--</span> Hz (<span id="freq${index}Cents">--</span> cents)`;

    controlRow.appendChild(checkbox);
    controlRow.appendChild(label);
    controlRow.appendChild(span);
    oscGroup.appendChild(controlRow);

    if (index === 0) {
      const rootLabel = document.createElement('label');
      rootLabel.htmlFor = 'rootSlider';
      rootLabel.textContent = 'Root Frequency (Hz):';

      const sliderRow = document.createElement('div');
      sliderRow.className = 'slider-row';

      const rootInput = document.createElement('input');
      rootInput.type = 'number';
      rootInput.id = 'rootInput';
      rootInput.min = '20';
      rootInput.max = '10000';
      rootInput.step = '1';
      rootInput.value = '220';

      const rootSlider = document.createElement('input');
      rootSlider.type = 'range';
      rootSlider.id = 'rootSlider';
      rootSlider.min = '20';
      rootSlider.max = '1000';
      rootSlider.step = '1';
      rootSlider.value = '220';

      sliderRow.appendChild(rootInput);
      sliderRow.appendChild(rootSlider);
      oscGroup.appendChild(rootLabel);
      oscGroup.appendChild(sliderRow);
    } else {
      const errorLabel = document.createElement('label');
      errorLabel.textContent = 'Error (Hz)';

      const sliderRow = document.createElement('div');
      sliderRow.className = 'slider-row';

      const errorInput = document.createElement('input');
      errorInput.type = 'number';
      errorInput.id = `error${index}Input`;
      errorInput.min = '-100';
      errorInput.max = '100';
      errorInput.step = '0.1';
      errorInput.value = '0';

      const errorSlider = document.createElement('input');
      errorSlider.type = 'range';
      errorSlider.id = `error${index}Slider`;
      errorSlider.min = '-20';
      errorSlider.max = '20';
      errorSlider.step = '0.1';
      errorSlider.value = '0';

      sliderRow.appendChild(errorInput);
      sliderRow.appendChild(errorSlider);
      oscGroup.appendChild(errorLabel);
      oscGroup.appendChild(sliderRow);
    }

    oscillatorContainer.appendChild(oscGroup);
  };

  // Generate oscillator groups f0 to f5
  for (let i = 0; i <= 5; i++) {
    createOscillatorGroup(i);
  }

  // Rest of the script
  let audioContext;
  let masterGain;
  const oscillators = [];
  const gains = [];

  let isPlaying = false;

  // Delta controls at top
  const deltaSlider    = document.getElementById('deltaSlider');
  const deltaInput     = document.getElementById('deltaInput');

  // Root frequency is now in the f0 block
  const rootSlider     = document.getElementById('rootSlider');
  const rootInput      = document.getElementById('rootInput');

  const toggleAudioBtn = document.getElementById('toggleAudioBtn');
  const resetErrorsBtn = document.getElementById('resetErrorsBtn');

  // Checkboxes (f0..f5)
  const checks = [
    document.getElementById('check0'),
    document.getElementById('check1'),
    document.getElementById('check2'),
    document.getElementById('check3'),
    document.getElementById('check4'),
    document.getElementById('check5')
  ];

  // Error sliders & inputs (f0 has no error slider)
  const errorSliders = [
    null,
    document.getElementById('error1Slider'),
    document.getElementById('error2Slider'),
    document.getElementById('error3Slider'),
    document.getElementById('error4Slider'),
    document.getElementById('error5Slider')
  ];
  const errorInputs = [
    null,
    document.getElementById('error1Input'),
    document.getElementById('error2Input'),
    document.getElementById('error3Input'),
    document.getElementById('error4Input'),
    document.getElementById('error5Input')
  ];

  // Frequency & cents displays
  const freqDisplaysHz = [
    document.getElementById('freq0Hz'),
    document.getElementById('freq1Hz'),
    document.getElementById('freq2Hz'),
    document.getElementById('freq3Hz'),
    document.getElementById('freq4Hz'),
    document.getElementById('freq5Hz'),
  ];
  const freqDisplaysCents = [
    document.getElementById('freq0Cents'),
    document.getElementById('freq1Cents'),
    document.getElementById('freq2Cents'),
    document.getElementById('freq3Cents'),
    document.getElementById('freq4Cents'),
    document.getElementById('freq5Cents'),
  ];

  // Link a slider and a number input
  function linkSliderAndInput(slider, number) {
    if (!slider || !number) return;
    slider.addEventListener('input', () => {
      number.value = slider.value;
      updateOscillators();
    });
    number.addEventListener('input', () => {
      slider.value = number.value;
      updateOscillators();
    });
  }

  // Link delta
  linkSliderAndInput(deltaSlider, deltaInput);

  // Link root
  linkSliderAndInput(rootSlider, rootInput);

  // Link error controls (f1..f5)
  for (let i = 1; i <= 5; i++) {
    linkSliderAndInput(errorSliders[i], errorInputs[i]);
  }

  // Checkboxes => on/off
  checks.forEach(chk => {
    chk.addEventListener('change', updateOscillators);
  });

  // Start/Stop Audio
  toggleAudioBtn.addEventListener('click', () => {
    if (!isPlaying) {
      startAudio();
      toggleAudioBtn.textContent = 'Stop Audio';
    } else {
      stopAudio();
      toggleAudioBtn.textContent = 'Start Audio';
    }
    isPlaying = !isPlaying;
  });

  // Reset Errors
  resetErrorsBtn.addEventListener('click', () => {
    for (let i = 1; i <= 5; i++) {
      if (errorSliders[i]) errorSliders[i].value = 0;
      if (errorInputs[i])  errorInputs[i].value  = 0;
    }
    updateOscillators();
  });

  // Start audio
  function startAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.1;
    masterGain.connect(audioContext.destination);

    for (let i = 0; i < 6; i++) {
      const osc = audioContext.createOscillator();
      osc.type = 'sine';

      const oscGain = audioContext.createGain();
      osc.connect(oscGain);
      oscGain.connect(masterGain);

      osc.start();

      oscillators.push(osc);
      gains.push(oscGain);
    }
    updateOscillators();
  }

  // Stop audio
  function stopAudio() {
    oscillators.forEach((osc, i) => {
      osc.stop();
      osc.disconnect();
      gains[i].disconnect();
    });
    oscillators.length = 0;
    gains.length = 0;

    if (masterGain) masterGain.disconnect();
    if (audioContext) audioContext.close();
    audioContext = null;
  }

  // Always compute freq/cents; only set oscillator values if audio is playing
  function updateOscillators() {
    const rootFreq = parseFloat(rootInput.value) || 220;
    const delta    = parseFloat(deltaInput.value) || 110;

    for (let i = 0; i < 6; i++) {
      const isOn = checks[i].checked;

      // Error for f1..f5
      let err = 0;
      if (i >= 1 && errorInputs[i]) {
        err = parseFloat(errorInputs[i].value) || 0;
      }

      // freq = root + i*delta + err
      const freq = rootFreq + i * delta + err;

      // Update displays
      freqDisplaysHz[i].textContent = freq.toFixed(2);

      if (i === 0) {
        // f0 = 0 cents
        freqDisplaysCents[i].textContent = '0.00';
      } else {
        if (rootFreq > 0 && freq > 0) {
          const cents = 1200 * Math.log2(freq / rootFreq);
          freqDisplaysCents[i].textContent = cents.toFixed(2);
        } else {
          freqDisplaysCents[i].textContent = '--';
        }
      }

      // If audio is active, update oscillator frequency & gain
      if (audioContext && oscillators.length === 6 && gains.length === 6) {
        oscillators[i].frequency.value = freq;
        gains[i].gain.value = isOn ? 1 : 0;
      }
    }
  }

  // Initialize display (before audio starts)
  updateOscillators();
});