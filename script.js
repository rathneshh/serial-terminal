let port;
let reader;
let writer;
let commandHistory = [];
let historyIndex = -1;

const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const sendBtn = document.getElementById('send-btn');
const input = document.getElementById('input');
const terminal = document.getElementById('terminal');
const baudrateSelect = document.getElementById('baudrate');

const appendCrCheckbox = document.getElementById('append-cr');
const appendLfCheckbox = document.getElementById('append-lf');
const echoCheckbox = document.getElementById('echo');

const fontSizeSlider = document.getElementById('font-size-slider');
const fontSizeDisplay = document.getElementById('font-size-display');
const fontColorSlider = document.getElementById('font-color-slider');
const fontColorDisplay = document.getElementById('font-color-display');

const saveConfigBtn = document.getElementById('save-config-btn');
const loadConfigBtn = document.getElementById('load-config-btn');
const toggleThemeBtn = document.getElementById('toggle-theme-btn');

// Serial connection functions
async function connect() {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: parseInt(baudrateSelect.value) });

    reader = port.readable.getReader();
    writer = port.writable.getWriter();

    connectBtn.disabled = true;
    disconnectBtn.disabled = false;
    sendBtn.disabled = false;
    input.disabled = false;

    readLoop();
  } catch (err) {
    terminal.textContent += `Error: ${err}\n`;
  }
}

async function readLoop() {
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      let text = new TextDecoder().decode(value);
      terminal.textContent += text;
      terminal.scrollTop = terminal.scrollHeight;
    }
  } catch (err) {
    terminal.textContent += `Read error: ${err}\n`;
  }
}

async function sendData() {
  let data = input.value;
  if (data.trim() === '') return; // Don't send empty commands

  // Add command to history and update index.
  commandHistory.push(data);
  historyIndex = commandHistory.length;

  // Append CR and/or LF if selected.
  if (appendCrCheckbox.checked) {
    data += '\r';
  }
  if (appendLfCheckbox.checked) {
    data += '\n';
  }
  // Echo the command if enabled.
  if (echoCheckbox.checked) {
    terminal.textContent += `\n>> ${input.value}\n`;
    terminal.scrollTop = terminal.scrollHeight;
  }
  input.value = '';
  try {
    await writer.write(new TextEncoder().encode(data));
  } catch (err) {
    terminal.textContent += `Send error: ${err}\n`;
  }
}

async function disconnect() {
  if (reader) {
    await reader.cancel();
    reader = null;
  }
  if (writer) {
    await writer.close();
    writer = null;
  }
  if (port) {
    await port.close();
    port = null;
  }

  connectBtn.disabled = false;
  disconnectBtn.disabled = true;
  sendBtn.disabled = true;
  input.disabled = true;
}

// Event Listeners for serial connection
connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);
sendBtn.addEventListener('click', sendData);
input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendData();
});

// Command History Navigation using ArrowUp/ArrowDown
input.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') {
    if (historyIndex > 0) {
      historyIndex--;
      input.value = commandHistory[historyIndex];
    }
    e.preventDefault();
  } else if (e.key === 'ArrowDown') {
    if (historyIndex < commandHistory.length - 1) {
      historyIndex++;
      input.value = commandHistory[historyIndex];
    } else {
      historyIndex = commandHistory.length;
      input.value = '';
    }
    e.preventDefault();
  }
});

// Appearance Settings
fontSizeSlider.addEventListener('input', () => {
  const size = fontSizeSlider.value;
  fontSizeDisplay.textContent = size;
  terminal.style.fontSize = size + 'px';
});

fontColorSlider.addEventListener('input', () => {
  const hue = fontColorSlider.value;
  fontColorDisplay.textContent = hue;
  terminal.style.color = `hsl(${hue}, 100%, 50%)`;
});

// Save/Load Configurations
saveConfigBtn.addEventListener('click', () => {
  const config = {
    baudrate: baudrateSelect.value,
    appendCr: appendCrCheckbox.checked,
    appendLf: appendLfCheckbox.checked,
    echo: echoCheckbox.checked,
    fontSize: fontSizeSlider.value,
    fontColorHue: fontColorSlider.value,
    darkTheme: document.body.classList.contains('dark-theme'),
    // Save the console's position and size.
    console: {
      top: draggableConsole.style.top || (draggableConsole.offsetTop + "px"),
      left: draggableConsole.style.left || (draggableConsole.offsetLeft + "px"),
      width: draggableConsole.style.width || (draggableConsole.offsetWidth + "px"),
      height: draggableConsole.style.height || (draggableConsole.offsetHeight + "px")
    }
  };
  localStorage.setItem('terminalConfig', JSON.stringify(config));
  alert('Configuration saved.');
});

loadConfigBtn.addEventListener('click', () => {
  const configString = localStorage.getItem('terminalConfig');
  if (configString) {
    const config = JSON.parse(configString);
    baudrateSelect.value = config.baudrate;
    appendCrCheckbox.checked = config.appendCr;
    appendLfCheckbox.checked = config.appendLf;
    echoCheckbox.checked = config.echo;
    fontSizeSlider.value = config.fontSize;
    fontSizeDisplay.textContent = config.fontSize;
    terminal.style.fontSize = config.fontSize + 'px';
    fontColorSlider.value = config.fontColorHue;
    fontColorDisplay.textContent = config.fontColorHue;
    terminal.style.color = `hsl(${config.fontColorHue}, 100%, 50%)`;
    if (config.darkTheme) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    // Restore console position and size if available.
    if (config.console) {
      draggableConsole.style.top = config.console.top;
      draggableConsole.style.left = config.console.left;
      draggableConsole.style.width = config.console.width;
      draggableConsole.style.height = config.console.height;
    }
    alert('Configuration loaded.');
  } else {
    alert('No configuration found.');
  }
});

// Theme toggle
toggleThemeBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
});

/* =============================\n   Draggable Console Window\n   ============================= */
const draggableConsole = document.getElementById("draggable-console");
const consoleHeader = document.getElementById("console-header");

let offsetX = 0, offsetY = 0, initialX = 0, initialY = 0;

consoleHeader.addEventListener("mousedown", dragMouseDown);

function dragMouseDown(e) {
  e.preventDefault();
  // Remove snapping animation class during dragging for immediate response.
  draggableConsole.classList.remove('animate');
  // Clear right property if set, so that left/width values take effect.
  if (draggableConsole.style.right) {
    draggableConsole.style.right = '';
  }
  // Record the initial mouse position.
  initialX = e.clientX;
  initialY = e.clientY;
  document.addEventListener("mousemove", dragMouseMove);
  document.addEventListener("mouseup", closeDragElement);
}

function dragMouseMove(e) {
  e.preventDefault();
  // Calculate how far the mouse has moved.
  offsetX = initialX - e.clientX;
  offsetY = initialY - e.clientY;
  initialX = e.clientX;
  initialY = e.clientY;
  // Update the element's position immediately.
  draggableConsole.style.top = (draggableConsole.offsetTop - offsetY) + "px";
  draggableConsole.style.left = (draggableConsole.offsetLeft - offsetX) + "px";
}

function closeDragElement() {
  document.removeEventListener("mousemove", dragMouseMove);
  document.removeEventListener("mouseup", closeDragElement);

  // Check if the console was dragged near the left edge (threshold: 20px)
  const rect = draggableConsole.getBoundingClientRect();
  if (rect.left <= 20) {
    // Add the snapping animation class.
    draggableConsole.classList.add('animate');

    // Get container and controls dimensions.
    const container = document.querySelector('.container');
    const containerRect = container.getBoundingClientRect();
    const controls = document.querySelector('.controls');
    let controlsHeight = controls ? controls.getBoundingClientRect().bottom : 100;

    // Define extra offsets.
    const extraTop = 63;      // Extra space added to the top so the options remain visible.
    const bottomMargin = 20;  // Bottom gap so that the console doesn't run off the screen.

    // Calculate the target snap position/dimensions:
    // - snapTop: set to the bottom of the controls plus a 10px gap plus extraTop.
    // - snapWidth: container width minus 40px (20px margin on each side).
    // - snapHeight: remaining height of container after subtracting snapTop and bottomMargin.
    const snapTop = controlsHeight + 10 + extraTop;
    const snapWidth = containerRect.width - 40;
    const snapHeight = containerRect.height - snapTop - bottomMargin;

    // Set the snap target values.
    draggableConsole.style.left = "20px";
    draggableConsole.style.top = snapTop + "px";
    draggableConsole.style.width = snapWidth + "px";
    draggableConsole.style.height = snapHeight + "px";

    // Once the snapping transition ends, remove the animation class.
    draggableConsole.addEventListener('transitionend', function handler(e) {
      draggableConsole.classList.remove('animate');
      draggableConsole.removeEventListener('transitionend', handler);
    });
  }
}

window.addEventListener('load', () => {
  const configString = localStorage.getItem('terminalConfig');
  if (configString) {
    const config = JSON.parse(configString);
    // Restore configuration values:
    baudrateSelect.value = config.baudrate;
    appendCrCheckbox.checked = config.appendCr;
    appendLfCheckbox.checked = config.appendLf;
    echoCheckbox.checked = config.echo;
    fontSizeSlider.value = config.fontSize;
    fontSizeDisplay.textContent = config.fontSize;
    terminal.style.fontSize = config.fontSize + 'px';
    fontColorSlider.value = config.fontColorHue;
    fontColorDisplay.textContent = config.fontColorHue;
    terminal.style.color = `hsl(${config.fontColorHue}, 100%, 50%)`;
    if (config.darkTheme) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    // Restore console position and size if available.
    if (config.console) {
      draggableConsole.style.top = config.console.top;
      draggableConsole.style.left = config.console.left;
      draggableConsole.style.width = config.console.width;
      draggableConsole.style.height = config.console.height;
    }
  }
});
