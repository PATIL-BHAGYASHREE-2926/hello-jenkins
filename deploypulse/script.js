
// ========================================
// DEPLOYPULSE - FRONTEND JAVASCRIPT
// ========================================

const API_BASE = "http://localhost:3000/api";


// 1. Live Clock
function updateClock() {
    const clock = document.getElementById("clock");

    if (clock) {
        clock.textContent = new Date().toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "medium"
        });
    }
}

updateClock();
setInterval(updateClock, 1000);


// 2. Initialize Dashboard
document.addEventListener("DOMContentLoaded", () => {

    const navItems = document.querySelectorAll(
        ".sidebar a[href^='#']"
    );

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            navItems.forEach(nav => nav.classList.remove("active"));
            item.classList.add("active");
        });
    });

    createConsoleViewer();
    loadJenkinsData();

    // Refresh Jenkins data every 30 seconds
    setInterval(loadJenkinsData, 30000);
});


// 3. Fetch Jenkins Data
// Try the live backend first (local development).
// If it's unreachable (for example on EC2), fall back to builds.json,
// which the pipeline writes into the same folder as index.html.
const SNAPSHOT_URL = "builds.json";

async function fetchBuildData() {
    try {
        const response = await fetch(`${API_BASE}/builds`);

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.status !== "success") {
            throw new Error(data.message || "Unable to load builds");
        }

        return { data, source: "live" };

    } catch (liveError) {
        console.warn("Live backend unavailable, using snapshot:", liveError.message);

        const response = await fetch(SNAPSHOT_URL, { cache: "no-store" });

        if (!response.ok) {
            throw new Error(`Snapshot error: ${response.status}`);
        }

        const data = await response.json();
        return { data, source: "snapshot" };
    }
}

async function loadJenkinsData() {
    try {
        const { data, source } = await fetchBuildData();

        updateDashboard(data);

        const status = document.getElementById("dashboard-status");
        if (status) {
            status.textContent = source === "live"
                ? "Jenkins Connected"
                : "Snapshot from last pipeline run";
        }

        console.log(`Jenkins data updated (${source}):`, data);

    } catch (error) {
        console.error("Dashboard update failed:", error);

        const status = document.getElementById("dashboard-status");
        if (status) {
            status.textContent = "Jenkins connection unavailable";
        }

        const history = document.getElementById("live-build-history");
        if (history) {
            history.textContent = "Unable to load Jenkins build history.";
        }
    }
}

// 4. Update Dashboard
function updateDashboard(data) {

    const metrics = document.querySelectorAll(".metrics .metric");

    if (metrics.length >= 3) {
        metrics[0].querySelector("h2").textContent = data.totalBuilds;
        metrics[1].querySelector("h2").textContent = data.successfulBuilds;
        metrics[2].querySelector("h2").textContent = data.failedBuilds;
    }

    updateLatestBuild(data.builds);
    updateBuildHistory(data.builds);
}


// 5. Update Latest Build
function updateLatestBuild(builds) {

    if (!builds || builds.length === 0) return;

    const latestBuild = builds.reduce((latest, current) =>
        current.number > latest.number ? current : latest
    );

    const latestPanel = document.querySelector(
        ".lower-grid .panel .build-row"
    );

    if (!latestPanel) return;

    const infraStatus = document.getElementById("jenkins-infra-status");

    if (infraStatus) {
        infraStatus.textContent =
            `Build #${latestBuild.number} ${latestBuild.result || "RUNNING"}`;

        infraStatus.className =
            latestBuild.result === "SUCCESS" ? "success-tag" : "tag";
    }

    const buildName = latestPanel.querySelector("b");
    const statusTag = latestPanel.querySelector(".success-tag");

    if (buildName) {
        buildName.textContent = `Build #${latestBuild.number}`;
    }

    if (statusTag) {
        const result = latestBuild.result || "RUNNING";

        statusTag.textContent =
            result === "SUCCESS" ? "✓ SUCCESS" :
            result === "FAILURE" ? "✕ FAILURE" :
            `● ${result}`;

        statusTag.className =
            result === "SUCCESS" ? "success-tag" : "tag";
    }

    const duration = latestPanel
        .closest(".panel")
        ?.querySelector(".details p b");

    if (duration) {
        duration.textContent =
            `${(latestBuild.duration / 1000).toFixed(2)} sec`;
    }
}


// 6. Render Live Build History
function updateBuildHistory(builds) {

    const container = document.getElementById("live-build-history");

    if (!container) return;

    if (!builds || builds.length === 0) {
        container.textContent = "No Jenkins builds found.";
        return;
    }

    container.replaceChildren();

    builds.forEach(build => {

        const result = build.result || "RUNNING";
        const duration = (build.duration / 1000).toFixed(2);
        const date = new Date(build.timestamp).toLocaleString("en-IN");

        const row = document.createElement("div");
        row.className = "infra-row build-history-row";

        const info = document.createElement("div");

        const button = document.createElement("button");
        button.className = "build-link";
        button.type = "button";
        button.textContent = `Build #${build.number} →`;
        button.addEventListener("click", () => {
            openBuildConsole(build.number);
        });

        const dateText = document.createElement("p");
        dateText.className = "muted";
        dateText.textContent = date;

        info.append(button, dateText);

        const status = document.createElement("span");
        status.className =
            result === "SUCCESS" ? "success-tag" : "tag";
        status.textContent = result;

        const time = document.createElement("span");
        time.textContent = `${duration}s`;

        row.append(info, status, time);
        container.appendChild(row);
    });
}


// 7. Create Console Viewer
function createConsoleViewer() {

    if (document.getElementById("console-modal")) return;

    const style = document.createElement("style");

    style.textContent = `
        .build-link {
            background: none;
            border: none;
            padding: 0;
            color: #35dca8;
            font: inherit;
            font-weight: 700;
            cursor: pointer;
            text-align: left;
        }

        .build-link:hover {
            color: #ffffff;
            text-decoration: underline;
        }

        .build-history-row {
            padding: 18px 0;
            gap: 15px;
        }

        #console-modal {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: rgba(0, 0, 0, 0.78);
        }

        #console-modal.visible {
            display: flex;
        }

        .console-window {
            width: min(950px, 100%);
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            background: #111c2d;
            border: 1px solid #263b52;
            border-radius: 14px;
            overflow: hidden;
        }

        .console-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 18px 22px;
            border-bottom: 1px solid #263b52;
        }

        .console-header h3 {
            margin: 0;
            color: #35dca8;
        }

        .console-close {
            background: #263b52;
            color: white;
            border: none;
            border-radius: 7px;
            padding: 8px 13px;
            cursor: pointer;
        }

        #console-output {
            padding: 20px;
            margin: 0;
            overflow: auto;
            color: #c6e6d8;
            background: #08111e;
            font: 13px/1.65 Consolas, monospace;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
            min-height: 220px;
        }
    `;

    document.head.appendChild(style);

    const modal = document.createElement("div");
    modal.id = "console-modal";

    modal.innerHTML = `
        <div class="console-window" role="dialog"
             aria-modal="true" aria-labelledby="console-title">
            <div class="console-header">
                <h3 id="console-title">Jenkins Console Output</h3>
                <button class="console-close" id="close-console"
                        type="button">✕ Close</button>
            </div>
            <pre id="console-output">Select a build to view its logs.</pre>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("close-console").addEventListener(
        "click", closeBuildConsole
    );

    modal.addEventListener("click", event => {
        if (event.target === modal) closeBuildConsole();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeBuildConsole();
    });
}


// 8. Fetch and Display Console Output
async function openBuildConsole(buildNumber) {

    const modal = document.getElementById("console-modal");
    const output = document.getElementById("console-output");
    const title = document.getElementById("console-title");

    modal.classList.add("visible");
    title.textContent = `Jenkins Console · Build #${buildNumber}`;
    output.textContent = "Loading console output...";

    try {
        const response = await fetch(
            `${API_BASE}/builds/${buildNumber}/console`
        );

        const data = await response.json();

        if (!response.ok || data.status !== "success") {
            throw new Error(data.message || "Unable to fetch console output");
        }

        output.textContent = data.consoleOutput ||
            "No console output available.";

    } catch (error) {
        console.error("Console viewer error:", error);

        output.textContent =
            `Unable to load console output.\n\n${error.message}`;
    }
}


// 9. Close Console Viewer
function closeBuildConsole() {
    const modal = document.getElementById("console-modal");

    if (modal) {
        modal.classList.remove("visible");
    }
}
