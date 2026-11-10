
require("dotenv").config();

const express = require("express");

const app = express();
const PORT = 3000;

const cors = require("cors");

app.use(express.json());

app.use(cors());

// Jenkins configuration from environment variables
const JENKINS_URL = process.env.JENKINS_URL;
const JENKINS_USER = process.env.JENKINS_USER;
const JENKINS_API_TOKEN = process.env.JENKINS_API_TOKEN;

app.get("/api/health", (req, res) => {
    res.json({
        status: "success",
        message: "DeployPulse backend is running!"
    });
});

// Fetch real Jenkins build information
app.get("/api/builds", async (req, res) => {
    try {
        if (!JENKINS_URL || !JENKINS_USER || !JENKINS_API_TOKEN) {
            return res.status(500).json({
                status: "error",
                message: "Jenkins environment variables are missing."
            });
        }

        const credentials = Buffer.from(
            `${JENKINS_USER}:${JENKINS_API_TOKEN}`
        ).toString("base64");

        const apiUrl =
            `${JENKINS_URL}/job/deploypulse-pipeline/api/json` +
            "?tree=name,builds[number,result,timestamp,duration,url]";

        const response = await fetch(apiUrl, {
            headers: {
                Authorization: `Basic ${credentials}`,
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`Jenkins HTTP error: ${response.status}`);
        }

        const data = await response.json();
        const builds = data.builds || [];

        const successful = builds.filter(
            build => build.result === "SUCCESS"
        ).length;

        const failed = builds.filter(
            build => build.result === "FAILURE"
        ).length;

        res.json({
            status: "success",
            job: data.name,
            totalBuilds: builds.length,
            successfulBuilds: successful,
            failedBuilds: failed,
            builds: builds
        });

    } catch (error) {
        console.error("Jenkins API error:", error.message);

        res.status(502).json({
            status: "error",
            message: "Unable to fetch Jenkins build data."
        });
    }
});
   
// Fetch console output for a specific Jenkins build
app.get("/api/builds/:number/console", async (req, res) => {
    try {
        const { number } = req.params;

        // Validate build number
        if (!/^\d+$/.test(number)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid build number."
            });
        }

        if (!JENKINS_URL || !JENKINS_USER || !JENKINS_API_TOKEN) {
            return res.status(500).json({
                status: "error",
                message: "Jenkins environment variables are missing."
            });
        }

        const credentials = Buffer.from(
            `${JENKINS_USER}:${JENKINS_API_TOKEN}`
        ).toString("base64");

        const consoleUrl =
            `${JENKINS_URL}/job/deploypulse-pipeline/${number}/consoleText`;

        const response = await fetch(consoleUrl, {
            headers: {
                Authorization: `Basic ${credentials}`
            }
        });

        if (!response.ok) {
            throw new Error(`Jenkins HTTP error: ${response.status}`);
        }

        const consoleText = await response.text();

        res.json({
            status: "success",
            buildNumber: Number(number),
            consoleOutput: consoleText
        });

    } catch (error) {
        console.error("Console API error:", error.message);

        res.status(502).json({
            status: "error",
            message: "Unable to fetch Jenkins console output."
        });
    }
});

app.listen(PORT, () => {
    console.log(
        `DeployPulse backend running at http://localhost:${PORT}`
    );
});