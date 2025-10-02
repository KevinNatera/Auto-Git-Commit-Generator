const diffCommandsEl = document.getElementById("diff-commands");
const platform = navigator.platform.toLowerCase();
let diffCommand = "";

if (platform.includes("mac")) {
  diffCommand = "git --no-pager diff | pbcopy";
} else if (platform.includes("win")) {
  diffCommand = "git --no-pager diff | Set-Clipboard";
} else {
  // assume Linux
  diffCommand = "git --no-pager diff | xsel --clipboard --input";
}

diffCommandsEl.textContent = diffCommand;

// Copy command to clipboard
document.getElementById("copy-btn").addEventListener("click", () => {
  navigator.clipboard
    .writeText(diffCommand)
    .then(() => alert("Command copied to clipboard!"))
    .catch((err) => alert("Failed to copy: " + err));
});

function parseGitDiff(diff) {
  const lines = diff.split("\n");
  const fileCommits = {};
  let currentFile = "";

  lines.forEach((line) => {
    // Detect file change
    const fileMatch = line.match(/^diff --git a\/(.+?) b\/(.+)/);
    if (fileMatch) {
      currentFile = fileMatch[2];
      if (!fileCommits[currentFile]) fileCommits[currentFile] = new Set();
    }

    if (!currentFile) return;

    // Choose regex based on file extension
    const ext = currentFile.split(".").pop().toLowerCase();
    let funcMatch = null;

    if (["js", "ts"].includes(ext)) {
      funcMatch = line.match(/^\+.*function (\w+)\(/);
    } else if (ext === "py") {
      funcMatch = line.match(/^\+.*def (\w+)\(/);
    } else if (ext === "go") {
      funcMatch = line.match(/^\+.*func (\w+)\(/);
    } else if (ext === "rs") {
      funcMatch = line.match(/^\+.*fn (\w+)\(/);
    } else if (ext === "rb") {
      funcMatch = line.match(/^\+.*def (\w+)/);
    } else if (["c", "cpp", "cs"].includes(ext)) {
      funcMatch = line.match(/^\+.*\b(\w+)\s+\w+\s*\(/);
    } else if (ext === "php") {
      funcMatch = line.match(/^\+.*function (\w+)\s*\{/);
    } else if (["vba", "vb"].includes(ext)) {
      funcMatch = line.match(/^\+.*Sub (\w+)/i);
    }

    if (funcMatch) fileCommits[currentFile].add(funcMatch[1]);
  });

  const commits = [];
  for (const [file, funcs] of Object.entries(fileCommits)) {
    if (funcs.size > 0) {
      const funcArray = Array.from(funcs);
      const funcWord = funcArray.length === 1 ? "function" : "functions";
      const funcsText = funcArray.join(", ");
      commits.push(`git add ${file}`);
      commits.push(`git commit -m "update/add ${funcWord} ${funcsText}"`);
    } else {
      commits.push(`git add ${file}`);
      commits.push(`git commit -m "general update"`);
    }
  }

  return commits;
}

document.getElementById("generate-btn").addEventListener("click", () => {
  const diffText = document.getElementById("diff-input").value;
  const commitMessages = parseGitDiff(diffText);
  const listEl = document.getElementById("commit-messages");
  listEl.innerHTML = "";

  // Step 1: Display commits
  commitMessages.forEach((msg) => {
    const li = document.createElement("li");
    li.textContent = msg;
    listEl.appendChild(li);
  });

  // Step 3: Copy button + extra instruction
  const copyAllBtn = document.createElement("button");
  copyAllBtn.textContent = "Copy All";
  copyAllBtn.style.marginTop = "0.5em";
  copyAllBtn.id = "copy-all-btn";

  copyAllBtn.addEventListener("click", () => {
    const commits = Array.from(document.querySelectorAll("#commit-messages li"))
      .map((li) => li.textContent)
      .join("\n");

    if (commits) {
      navigator.clipboard
        .writeText(commits)
        .then(() => alert("All commit commands copied!"))
        .catch((err) => alert("Failed to copy: " + err));
    }
  });

  listEl.appendChild(copyAllBtn);

  const instructionsEl = document.createElement("div");
  instructionsEl.className = "instructions-box"; // match existing instruction CSS
  instructionsEl.textContent =
    "3. Click 'Copy All' to copy these commands to your clipboard, then paste them into your terminal and hit enter to finish committing!";

  // 2. Append to the bottom of the page
  const container = document.querySelector(".container");
  container.appendChild(instructionsEl);

  // Scroll to bottom of page
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
});

// Clear the git diff input
document.getElementById("clear-btn").addEventListener("click", () => {
  document.getElementById("diff-input").value = "";

  // Clear generated commit messages
  const commitList = document.getElementById("commit-messages");
  if (commitList) commitList.innerHTML = "";

  // Hide copy button if you’re using one for commits
  const copyAllBtn = document.getElementById("copy-all-btn");
  if (copyAllBtn) copyAllBtn.remove();

  const instructionsEl = document.querySelector(".instructions-box");
  if (instructionsEl) {
    instructionsEl.remove(); // or instructionsEl.style.display = "none";
  }
});
