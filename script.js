const terminalOutput = document.getElementById('terminal-output');
const terminalInput = document.getElementById('terminal-input');

// --- Simulated File System (in-memory) ---
const fileSystem = {
    '/': { // Root directory
        type: 'directory',
        children: {
            'home': {
                type: 'directory',
                children: {
                    'user': {
                        type: 'directory',
                        children: {} // User's home directory
                    }
                }
            },
            'bin': { type: 'directory', children: {} },
            'etc': { type: 'directory', children: {} },
            'documents.txt': { type: 'file', content: 'This is a sample document.' }
        }
    }
};

let currentDirectory = fileSystem['/home/user']; // Start in user's home directory (simulated)
let currentPath = '/home/user';

// --- Command History ---
const commandHistory = [];
let historyIndex = -1;

// --- Available Commands ---
const commands = {
    'help': function() {
        outputToTerminal(`Available commands:`);
        outputToTerminal(`  help      - Show this help message`);
        outputToTerminal(`  echo [text] - Print text to the terminal`);
        outputToTerminal(`  clear     - Clear the terminal`);
        outputToTerminal(`  date      - Display current date and time`);
        outputToTerminal(`  ls        - List files and directories in current directory`);
        outputToTerminal(`  cd [path] - Change directory`);
        outputToTerminal(`  mkdir [dir] - Create a directory`);
        outputToTerminal(`  rmdir [dir] - Remove a directory (empty only)`);
        outputToTerminal(`  touch [file]- Create an empty file`);
        outputToTerminal(`  rm [file] - Remove a file`);
        outputToTerminal(`  cat [file] - Display file content`);
        outputToTerminal(`  calc [expression] - Simple calculator (use with caution!)`); // Added warning
        outputToTerminal(`  notepad (NOT WORKING)   - Open a simple notepad`);
        outputToTerminal(`  sysfetch  - Display system information`); // Added sysfetch to help
        outputToTerminal(`  browser [query] | ddg [query] - Search DuckDuckGo in a new tab`); // Added browser to help
    },
    'echo': function(args) {
        outputToTerminal(args.join(' '));
    },
    'clear': function() {
        terminalOutput.innerHTML = '';
    },
    'date': function() {
        outputToTerminal(new Date().toLocaleString());
    },
    'ls': function() {
        if (!currentDirectory || currentDirectory.type !== 'directory') {
            outputToTerminal(`<span class="error">Error: Not a directory.</span>`);
            return;
        }
        const items = Object.keys(currentDirectory.children);
        if (items.length === 0) {
            outputToTerminal(' (empty directory)');
            return;
        }
        items.forEach(item => {
            const itemType = currentDirectory.children[item].type;
            const itemClass = itemType === 'directory' ? 'directory' : 'file';
            outputToTerminal(`<span class="${itemClass}">${item}</span>`);
        });
    },
    'cd': function(args) {
        if (!args[0]) {
            outputToTerminal(`<span class="error">Error: Missing directory path.</span>`);
            return;
        }
        const targetPath = args[0];
        let newDir;

        if (targetPath === '..') { // Navigate to parent directory
            const pathParts = currentPath.split('/').filter(part => part !== '');
            if (pathParts.length > 1) { // Ensure not already at root
                pathParts.pop(); // Remove the last part of the path
                currentPath = '/' + pathParts.join('/'); // Reconstruct parent path
            } else {
                currentPath = '/'; // Stay at root if already there or go to root if path was just "/"
            }
            newDir = resolvePath(currentPath); // Resolve the new path to a directory object

        } else if (targetPath.startsWith('/')) { // Absolute path
            newDir = resolvePath(targetPath);
            if (newDir && newDir.type === 'directory') {
                currentPath = targetPath;
            } else {
                outputToTerminal(`<span class="error">Error: Directory not found: ${targetPath}</span>`);
                return; // Exit function if directory not found
            }
        } else { // Relative path
            const combinedPath = currentPath + '/' + targetPath;
            newDir = resolvePath(combinedPath);
            if (newDir && newDir.type === 'directory') {
                currentPath = combinedPath;
            } else {
                outputToTerminal(`<span class="error">Error: Directory not found: ${targetPath}</span>`);
                return; // Exit function if directory not found
            }
        }

        if (newDir && newDir.type === 'directory') { // Double check after path resolution
            currentDirectory = newDir;
            updatePrompt(); // Update prompt only if directory change was successful
        }
    },
    'mkdir': function(args) {
        if (!args[0]) {
            outputToTerminal(`<span class="error">Error: Missing directory name.</span>`);
            return;
        }
        const dirName = args[0];
        if (currentDirectory.children[dirName]) {
            outputToTerminal(`<span class="error">Error: Directory already exists: ${dirName}</span>`);
            return;
        }
        currentDirectory.children[dirName] = { type: 'directory', children: {} };
        outputToTerminal(`Directory "${dirName}" created.`);
    },
    'rmdir': function(args) {
        if (!args[0]) {
            outputToTerminal(`<span class="error">Error: Missing directory name.</span>`);
            return;
        }
        const dirName = args[0];
        if (!currentDirectory.children[dirName] || currentDirectory.children[dirName].type !== 'directory') {
            outputToTerminal(`<span class="error">Error: Directory not found: ${dirName}</span>`);
            return;
        }
        if (Object.keys(currentDirectory.children[dirName].children).length > 0) {
            outputToTerminal(`<span class="error">Error: Directory not empty: ${dirName}</span>`); // Basic rmdir is for empty directories
            return;
        }
        delete currentDirectory.children[dirName];
        outputToTerminal(`Directory "${dirName}" removed.`);
    },
    'touch': function(args) {
        if (!args[0]) {
            outputToTerminal(`<span class="error">Error: Missing file name.</span>`);
            return;
        }
        const fileName = args[0];
        if (currentDirectory.children[fileName]) {
            outputToTerminal(`<span class="error">Error: File or directory already exists: ${fileName}</span>`);
            return;
        }
        currentDirectory.children[fileName] = { type: 'file', content: '' }; // Create empty file
        outputToTerminal(`File "${fileName}" created.`);
    },
    'rm': function(args) {
        if (!args[0]) {
            outputToTerminal(`<span class="error">Error: Missing file name.</span>`);
            return;
        }
        const fileName = args[0];
        if (!currentDirectory.children[fileName] || currentDirectory.children[fileName].type !== 'file') {
            outputToTerminal(`<span class="error">Error: File not found: ${fileName}</span>`);
            return;
        }
        delete currentDirectory.children[fileName];
        outputToTerminal(`File "${fileName}" removed.`);
    },
    'cat': function(args) {
        if (!args[0]) {
            outputToTerminal(`<span class="error">Error: Missing file name.</span>`);
            return;
        }
        const fileName = args[0];
        if (!currentDirectory.children[fileName] || currentDirectory.children[fileName].type !== 'file') {
            outputToTerminal(`<span class="error">Error: File not found: ${fileName}</span>`);
            return;
        }
        outputToTerminal(currentDirectory.children[fileName].content);
    },
    'calc': function(args) {
        if (!args.length) {
            outputToTerminal(`<span class="error">Error: Missing expression for calculator.</span>`);
            outputToTerminal(`Usage: calc [expression] (e.g., calc 2 + 3 * 4)`);
            return;
        }
        try {
            const expression = args.join(' ');
            // Basic and *insecure* eval for demonstration. In real apps, use a safer expression parser.
            // **WARNING:**  `eval()` can be dangerous if you're dealing with untrusted input.
            const result = eval(expression);
            outputToTerminal(`= ${result}`);
        } catch (error) {
            outputToTerminal(`<span class="error">Error: Invalid expression.</span>`);
        }
    },
    'notepad': function() {
        openNotepad();
    },
    'sysfetch': function() {
        const osName = 'HTML OS';
        const kernel = 'HTML Kernel 1.0';
        const shell = 'HTML CLI';
        const browserName = navigator.userAgent.match(/(chrome|firefox|safari|edge|opera)/i)?.[1] || 'Unknown Browser';
        const browserVersionMatch = navigator.userAgent.match(/(chrome|firefox|safari|edge|opera)[\/\s](\d+)/i);
        const browserVersion = browserVersionMatch ? browserVersionMatch[2] : 'Unknown Version';
        const resolution = `${screen.width}x${screen.height}`;
        const uptime = getUptime();

        outputToTerminal(`<pre>
     /\_/\
    ( o.o )  <---  "Taggy" the HTML OS Mascot!
    > ^ <     /
   /   _ \   /
  |    / \  /
   \  /   \
    ||    *
    \/

        <span style="color: lightblue;">OS Name:</span>    ${osName}
        <span style="color: lightblue;">Kernel:</span>     ${kernel}
        <span style="color: lightblue;">Shell:</span>      ${shell}
        <span style="color: lightblue;">Browser:</span>    ${browserName} ${browserVersion}
        <span style="color: lightblue;">Resolution:</span> ${resolution}
        <span style="color: lightblue;">Uptime:</span>     ${uptime}
        </pre>`);
    },
    'browser': function(args) {
        if (!args.length) {
            outputToTerminal(`<span class="error">Error: Missing search query for browser.</span>`);
            outputToTerminal(`Usage: browser [search query] (e.g., browser html os)`);
            return;
        }
        const searchQuery = args.join(' ');
        const duckduckgoUrl = `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`;
        window.open(duckduckgoUrl, '_blank');
        outputToTerminal(`Opening DuckDuckGo in a new tab for query: "${searchQuery}"`);
    },
    'ddg': function(args) { // Alias for browser command
        commands['browser'](args);
    }
};


// --- Helper Functions ---

let startTime = Date.now();
function getUptime() {
    const currentTime = Date.now();
    const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    return `${minutes}m ${seconds}s`;
}


function outputToTerminal(text) {
    const line = document.createElement('div');
    line.classList.add('terminal-line');
    line.innerHTML = text;
    terminalOutput.appendChild(line);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function processCommand(command) {
    const parts = command.trim().split(/\s+/);
    const commandName = parts[0];
    const args = parts.slice(1);

    if (commandName === '') return; // Handle empty input

    commandHistory.unshift(command);
    historyIndex = -1;

    const commandFunction = commands[commandName];
    if (commandFunction) {
        commandFunction(args);
    } else {
        outputToTerminal(`<span class="error">Command not found: ${commandName}</span>`);
        commands['help'](); // Suggest help
    }
}

function resolvePath(path) {
    // Handles both absolute and relative paths within the simulated file system.
    let current = fileSystem['/']; // Start at the root for absolute paths or relative resolution starting point

    if (!path.startsWith('/')) { // Relative path handling
        current = currentDirectory; // Start relative path resolution from the current directory
    } else {
        path = path.substring(1); // Remove leading '/' for absolute path resolution from root
    }

    const parts = path.split('/').filter(part => part !== ''); // Split into directory names and filter out empty parts

    for (const part of parts) {
        if (!current || current.type !== 'directory' || !current.children[part]) {
            return null; // Path doesn't exist or is not a directory at some point
        }
        current = current.children[part]; // Move down to the next level in the file system
    }
    return current; // Return the resolved directory or file object (could be null if path invalid)
}


function updatePrompt() {
    const promptSpan = document.querySelector('.prompt');
    promptSpan.textContent = `user@htmlos:${currentPath}$`;
}

// --- Notepad Application (Simple Example) ---
let notepadWindow = null;

function openNotepad() { /* ... (same as before - Notepad function is unchanged) ... */ }
function closeNotepad() { /* ... (same as before - Notepad function is unchanged) ... */ }


// --- Event Listeners ---
terminalInput.addEventListener('keydown', function(event) {
    console.log("Key pressed:", event.key); // DEBUG: Check if any keypress is detected

    if (event.key === 'Enter') {
        console.log("Enter key pressed!"); // DEBUG: Confirm Enter key is detected
        event.preventDefault(); // Prevent default newline in input

        const command = terminalInput.value;
        console.log("Command entered:", command); // DEBUG: Check if input value is captured

        outputToTerminal(`<span class="prompt">user@htmlos:${currentPath}$</span> ${command}`);
        processCommand(command);
        terminalInput.value = ''; // Clear input

        // Explicitly refocus the input after processing the command
        terminalInput.focus();
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (commandHistory.length > 0) {
            historyIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
            terminalInput.value = commandHistory[historyIndex];
            terminalInput.focus(); // Refocus input after history navigation
        }
    } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (commandHistory.length > 0 && historyIndex > -1) {
            historyIndex = Math.max(historyIndex - 1, -1);
            terminalInput.value = commandHistory[historyIndex] || '';
            terminalInput.focus(); // Refocus input after history navigation
        }
    }
});

// --- Initial Setup and Focus ---
function initializeTerminal() {
    outputToTerminal("Welcome to HTML OS - CLI!");
    outputToTerminal("Type 'help' to see available commands.");
    updatePrompt();
    terminalInput.focus(); // Ensure input has focus initially
    console.log("Terminal initialized, input focused."); // DEBUG: Confirm initialization and focus
}

// Call initializeTerminal when the script loads
initializeTerminal();
