# Mantra & Naam Editor

A lightweight, local web-based JSON editor designed specifically to manage the `mantras` and `naams` JSON files for the Mantra-Naam project. 

It provides a safe, simple, and beautiful UI with full syntax highlighting to edit files directly on your local machine, eliminating the need to modify complex JSON files in a standard text editor.

## Features
- **Sidebar File Explorer**: Easily browse all `.json` files within the `mantras` and `naams` directories.
- **Monaco Editor Integration**: Edits are powered by the Monaco Editor (the core engine behind VS Code) giving you rich syntax highlighting, JSON validation, and formatting right in the browser.
- **Create New Files**: One-click scaffold to create new Mantra or Naam JSON files with the correct base structure.
- **Quick Save**: Hit `Ctrl+S` (or `Cmd+S`) to instantly save your changes back to disk.

## Requirements
- [Node.js](https://nodejs.org/) installed on your machine.

## How to Run

1. Open your terminal and navigate to this `editor` directory:
   ```bash
   cd path/to/mantra-naam/editor
   ```

2. If you haven't already, install the necessary dependencies (only needed the first time):
   ```bash
   npm install
   ```

3. Start the local server:
   ```bash
   npm start
   # or
   node server.js
   ```

4. Open your web browser and navigate to:
   [http://localhost:3000](http://localhost:3000)

## Architecture

- **Backend**: A minimal Express.js server (`server.js`) that safely reads and writes to the `../mantras` and `../naams` directories. It prevents directory traversal for security.
- **Frontend**: A vanilla HTML/CSS/JS application served statically. The UI is built with a custom dark-mode CSS theme and pulls the Monaco editor from a CDN.

## Security Note
This tool is intended to be run **locally only**. It grants direct read/write access to your local filesystem. Do not deploy this `editor` directory to a public web server without adding authentication.
