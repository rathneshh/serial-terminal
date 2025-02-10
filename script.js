let port, reader, writer;
let commandHistory = [];
let historyIndex = -1;

// Ensure script runs after DOM loads
document.addEventListener("DOMContentLoaded", () => {
    const connectBtn = document.getElementById("connect-btn");
    const disconnectBtn = document.getElementById("disconnect-btn");
    const sendBtn = document.getElementById("send-btn");
    const input = document.getElementById("input");
    const terminal = document.getElementById("terminal");
    const baudrateSelect = document.getElementById("baudrate");
    const appendCrCheckbox = document.getElementById("append-cr");
    const appendLfCheckbox = document.getElementById("append-lf");
    const echoCheckbox = document.getElementById("echo");
    const fontSizeSlider = document.getElementById("font-size-slider");
    const fontSizeDisplay = document.getElementById("font-size-display");
    const fontColorSlider = document.getElementById("font-color-slider");
    const fontColorDisplay = document.getElementById("font-color-display");
    const saveConfigBtn = document.getElementById("save-config-btn");
    const loadConfigBtn = document.getElementById("load-config-btn");
    const toggleThemeBtn = document.getElementById("toggle-theme-btn");
    const draggableConsole = document.getElementById("draggable-console");

    async function connect() {
        if (!navigator.serial) {
            terminal.textContent += "Error: Web Serial API not supported in this browser.\n";
            return;
        }
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
            terminal.textContent += `Error: ${err.message}\n`;
        }
    }

    async function readLoop() {
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                terminal.textContent += new TextDecoder().decode(value);
                terminal.scrollTop = terminal.scrollHeight;
            }
        } catch (err) {
            terminal.textContent += `Read error: ${err.message}\n`;
        }
    }

    async function sendData() {
        let data = input.value.trim();
        if (!data) return;
        
        commandHistory.push(data);
        historyIndex = commandHistory.length;
        
        if (appendCrCheckbox.checked) data += "\r";
        if (appendLfCheckbox.checked) data += "\n";
        if (echoCheckbox.checked) {
            terminal.textContent += `\n>> ${input.value}\n`;
            terminal.scrollTop = terminal.scrollHeight;
        }
        input.value = "";
        
        try {
            await writer.write(new TextEncoder().encode(data));
        } catch (err) {
            terminal.textContent += `Send error: ${err.message}\n`;
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

    // Event Listeners
    if (connectBtn) connectBtn.addEventListener("click", connect);
    if (disconnectBtn) disconnectBtn.addEventListener("click", disconnect);
    if (sendBtn) sendBtn.addEventListener("click", sendData);
    if (input) input.addEventListener("keypress", (e) => { if (e.key === "Enter") sendData(); });

    // Prevent errors on missing elements
    if (fontSizeSlider && fontSizeDisplay && terminal) {
        fontSizeSlider.addEventListener("input", () => {
            fontSizeDisplay.textContent = fontSizeSlider.value;
            terminal.style.fontSize = fontSizeSlider.value + "px";
        });
    }
    if (fontColorSlider && fontColorDisplay && terminal) {
        fontColorSlider.addEventListener("input", () => {
            fontColorDisplay.textContent = fontColorSlider.value;
            terminal.style.color = `hsl(${fontColorSlider.value}, 100%, 50%)`;
        });
    }

    // Theme Toggle
    if (toggleThemeBtn) toggleThemeBtn.addEventListener("click", () => document.body.classList.toggle("dark-theme"));
});
