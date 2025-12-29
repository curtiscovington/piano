export async function setupMIDI({ midiStatus, info, handleNoteOn, handleNoteOff, onDevicesChanged }) {
  if (!('requestMIDIAccess' in navigator)) {
    if (midiStatus) {
      midiStatus.innerHTML = '<span class="dot" style="background:#ff7c8f"></span>No MIDI support';
    }
    if (info) {
      info.textContent = 'This browser does not support Web MIDI. Use Chrome or Edge for MIDI input.';
    }
    notifyDevicePresence(null, onDevicesChanged);
    return;
  }

  if (midiStatus) {
    midiStatus.innerHTML = '<span class="dot"></span>Waiting for permission…';
  }

  try {
    const access = await navigator.requestMIDIAccess({ sysex: false });
    if (midiStatus) {
      midiStatus.innerHTML = '<span class="dot" style="background:#7cffb1"></span>MIDI ready';
    }
    if (info) {
      info.textContent = 'Connected. Press keys on your piano to flood the screen.';
    }
    access.onstatechange = (event) => handleStateChange(event, { info, handleNoteOn, handleNoteOff, onDevicesChanged, access });
    access.inputs.forEach((input) => listenToInput(input, { handleNoteOn, handleNoteOff }));
    notifyDevicePresence(access, onDevicesChanged);
    window.midiAccess = access;
  } catch (err) {
    if (midiStatus) {
      midiStatus.innerHTML = '<span class="dot" style="background:#ff7c8f"></span>MIDI blocked';
    }
    if (info) {
      info.textContent = 'MIDI permission was denied. Please allow access and reconnect your keyboard.';
    }
    notifyDevicePresence(null, onDevicesChanged);
  }
}

function handleStateChange(event, { info, handleNoteOn, handleNoteOff, onDevicesChanged, access }) {
  if (event.port.type === 'input') {
    const label = event.port.name || 'MIDI device';
    if (event.port.state === 'connected') {
      if (info) {
        info.textContent = 'Connected to ' + label + '. Play to paint the canvas.';
      }
      listenToInput(event.port, { handleNoteOn, handleNoteOff });
    } else if (info) {
      info.textContent = label + ' disconnected.';
    }
  }
  notifyDevicePresence(access, onDevicesChanged);
}

function listenToInput(input, { handleNoteOn, handleNoteOff }) {
  input.onmidimessage = (message) => {
    const [status, note, velocity] = message.data;
    const command = status & 0xf0;
    if (command === 0x90 && velocity > 0) {
      handleNoteOn(note, velocity);
    } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      handleNoteOff(note);
    }
  };
}

function notifyDevicePresence(access, onDevicesChanged) {
  if (typeof onDevicesChanged !== 'function') return;
  const inputs = access?.inputs ? Array.from(access.inputs.values()) : [];
  const connectedInputs = inputs.filter((input) => input.state === 'connected');
  onDevicesChanged({
    connected: connectedInputs.length > 0,
    inputs: connectedInputs
  });
}
