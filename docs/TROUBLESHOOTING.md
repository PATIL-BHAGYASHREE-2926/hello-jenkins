# DeployPulse — Troubleshooting & Problem Solving

This document records the major technical challenges encountered while developing DeployPulse, their root causes, the debugging process, and the solutions implemented.

The goal is to document the actual engineering decisions and lessons learned during development.

---

## 1. Public Dashboard Displayed Stale Data

**Problem**

The dashboard worked locally but failed to retrieve live Jenkins build data when accessed through the public EC2 deployment.

**Root Cause**

The frontend used:

```javascript
const API_BASE = "http://localhost:3000/api";
```

In a public browser, `localhost` refers to the visitor's own machine, not the developer's laptop or the EC2 instance.

**Solution**

Implemented a snapshot-based fallback mechanism:

- Jenkins generates a `builds.json` file during the pipeline.
- The snapshot is included in the Docker image.
- The frontend first attempts to retrieve live backend data.
- If the live API request fails, it loads `builds.json` instead.

**Outcome**

The public dashboard can display the latest available pipeline snapshot even when the live backend is unreachable.

**Learning**

`localhost` is relative to the machine making the request. A locally working API URL is not automatically valid for a publicly deployed frontend.

---

## 2. Deployment Success Was Not Proof of Successful Deployment

**Problem**

The Jenkins Deploy stage displayed SUCCESS, but this did not confirm that the deployment command had completed successfully on EC2.

**Root Cause**

The pipeline submitted a deployment command through AWS Systems Manager (SSM). A successfully submitted command can remain queued or execute later.

**Debugging**

Used:

```bash
aws ssm list-command-invocations
```

This helped inspect command execution status and verify individual invocation results.

**Solution**

Used SSM command invocation details to investigate actual execution on the EC2 instance instead of relying only on Jenkins' green Deploy stage.

**Current Limitation**

A completed SSM command is not, by itself, proof that the application container is healthy. Automated post-deployment health checks and rollback are future improvements.

**Learning**

A successful pipeline stage and a verified deployment are two different things.

---

## 3. Hardcoded Dashboard Values Became Stale

**Problem**

Some dashboard elements continued displaying old values, such as a hardcoded build status, when the JavaScript update failed or did not execute as expected.

**Root Cause**

There were two related HTML issues:

- The same `id` was assigned to two different elements. Since `document.getElementById()` returns the first matching element, the JavaScript updated the Latest Build chip instead of the Infrastructure status row.
- The Latest Build chip also used the wrong CSS class (`tag` instead of `success-tag`), so the update function did not match it as expected.

**Solution**

- Kept the `jenkins-infra-status` ID only on the Infrastructure element.
- Matched the CSS class expected by the update function.
- Used the correct placeholder:

```html
<span id="jenkins-infra-status" class="tag">Loading...</span>
```

- Updated the element dynamically using the latest available build information.

**Outcome**

The Infrastructure status now has a unique target element for JavaScript updates instead of conflicting with the Latest Build chip.

**Learning**

HTML IDs must be unique within a page. Even a small mismatch between element IDs and CSS classes can cause unexpected frontend behaviour.

---

## 4. Browser Cache Hid Updated JavaScript

**Problem**

Changes had been deployed, but the browser continued displaying outdated dashboard information, including the earlier hardcoded "Build #8 passed" value.

**Root Cause**

There were two contributing factors:

- Browser caching caused an older JavaScript file to be loaded.
- The duplicate HTML ID and incorrect CSS class meant the intended element was not being updated correctly.

**Debugging**

Used `curl` to inspect the JavaScript file actually served by the server and opened the site in an InPrivate browser window to compare the result without the usual browsing cache.

**Solution**

Verified the served JavaScript independently of the normal browser session, corrected the HTML element targeting issue, and used a fresh browsing session to confirm the updated version.

**Learning**

A successful deployment does not guarantee that every browser is immediately loading the newest frontend assets. Debugging should also check whether the JavaScript is targeting the correct HTML element.

---

## 5. Public Console Logs Were Not Available

**Problem**

The console log viewer worked in local development but could not retrieve logs from the public EC2 dashboard.

**Root Cause**

The log viewer depends on the Node.js backend, which was running on the developer's laptop. The public EC2 frontend could not access that laptop's local backend.

**Solution**

Disabled console log buttons when the dashboard is running in snapshot mode.

The local version retains live console log functionality through the backend API.

**Current Limitation**

Public console log access is not implemented yet.

**Planned Improvement**

Deploy the backend in an accessible environment and configure an Nginx reverse proxy for `/api`.

The backend will also need secure connectivity to Jenkins. Moving the backend alone will not make a laptop-hosted Jenkins server publicly reachable.

**Learning**

Frontend, backend, and Jenkins connectivity must be considered separately when designing a public monitoring dashboard.

---

## 6. Potential Jenkins API Token Exposure

**Problem**

A leftover temporary archive was identified as a potential location for a Jenkins API token.

**Root Cause**

Temporary project files and archives can accidentally retain sensitive configuration or credentials.

The archive was treated as a potential exposure risk. Its contents were not confirmed to contain the `.env` file.

**Solution**

- Rotated the Jenkins API token as a precaution.
- Removed the leftover temporary archives.
- Updated `.gitignore` to exclude sensitive and temporary files.
- Kept backend credentials in the local `.env` configuration rather than committing them to GitHub.

**Security Note**

The file was never committed to GitHub; it existed only in the local project folder.

The token rotation was a precautionary security measure, not a response to confirmed unauthorized access.

**Learning**

Secrets should never be committed to a public repository. If a credential may have been exposed, it should be revoked or rotated rather than simply deleting the file containing it.

---

## 7. Important Architecture Decisions

| Component | Current implementation |
|---|---|
| CI/CD | Jenkins |
| Containerization | Docker |
| Image registry | Amazon ECR |
| Cloud infrastructure | Amazon EC2 |
| Deployment integration | AWS Systems Manager |
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js |
| Public dashboard data | Jenkins-generated JSON snapshot |
| Local dashboard data | Live Jenkins API |

### Public vs Local Dashboard

**Public deployment:**

- Displays the latest available `builds.json` snapshot.
- Snapshot is regenerated during pipeline execution.
- Does not currently provide live Jenkins API access or public console logs.

**Local development:**

- Connects to the Node.js backend.
- Retrieves live Jenkins build information.
- Refreshes dashboard data every 30 seconds.
- Supports console log retrieval.

**Snapshot timing note:** The snapshot is generated before the build finishes, so the latest build can appear as RUNNING in the public dashboard until another pipeline run updates the snapshot.

---

## 8. Security and Repository Transparency

The public repository contains an AWS account ID in `Jenkinsfile` and `deploy.json`.

AWS account IDs are identifiers, not secret credentials like access keys or API tokens. Nevertheless, they are visible infrastructure details and should be reviewed before publishing a repository.

No AWS access keys, secret keys, or Jenkins API tokens should be committed to the repository.

---

## 9. What I Would Do Differently

Looking back at the development process, a few practices could have prevented some of the debugging issues:

- Use unique HTML IDs from the beginning.
- Keep CSS classes consistent with JavaScript update conditions.
- Test each dashboard element independently after making changes.
- Separate local and public environment configuration.
- Verify SSM command execution rather than relying only on Jenkins stage status.
- Add automated post-deployment health checks.
- Review temporary files and repository contents before every public commit.

---

## 10. Future Improvements

- Deploy the Node.js backend in an accessible environment.
- Configure Nginx reverse proxy for backend API requests.
- Enable secure public console log access.
- Establish secure connectivity between the backend and Jenkins.
- Add post-deployment container health checks.
- Implement deployment failure handling and rollback.
- Improve snapshot accuracy after pipeline completion.

---

## Conclusion

Building DeployPulse provided hands-on experience with CI/CD automation, Docker, AWS infrastructure, API integration, frontend-backend communication, deployment verification, and security practices.

The most important lesson was that getting a pipeline to execute is only one part of DevOps. Understanding failures, verifying deployments, handling unavailable services, and protecting credentials are equally important.

**Build. Debug. Verify. Improve.**
